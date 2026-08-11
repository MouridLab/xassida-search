import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { authError, requireStaff } from "@/lib/admin-auth";
import { normalizeArabic, normalizeLatin } from "@/lib/normalize";
const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Number(v)));
const schema = z.object({
  khassida_id: z.string().uuid(),
  arabic_text: z.string().optional(),
  transcription: z.string().optional(),
  french_translation: z.string().optional(),
  commentary: z.string().optional(),
  chapter_number: optionalNumber,
  verse_start: optionalNumber,
  verse_end: optionalNumber,
  page_number: optionalNumber,
  validation_status: z.enum(["draft", "review", "verified"]).default("draft"),
});
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const auth = await requireStaff(req, body.validation_status === "verified");
    let embedding: null | number[] = null;
    if (process.env.OPENAI_API_KEY) {
      const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const text = [
        body.arabic_text,
        body.transcription,
        body.french_translation,
        body.commentary,
      ]
        .filter(Boolean)
        .join("\n");
      if (text)
        embedding = (
          await ai.embeddings.create({
            model:
              process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
            input: text,
          })
        ).data[0].embedding;
    }
    const { data, error } = await auth.db
      .from("khassida_chunks")
      .insert({
        ...body,
        normalized_arabic: normalizeArabic(body.arabic_text || ""),
        normalized_transcription: normalizeLatin(body.transcription || ""),
        embedding,
        created_by: auth.user.id,
        validated_by:
          body.validation_status === "verified" ? auth.user.id : null,
      })
      .select()
      .single();
    if (error) throw error;
    await auth.db
      .from("audit_log")
      .insert({
        actor_id: auth.user.id,
        entity_type: "chunk",
        entity_id: data.id,
        action: "create",
        new_data: data,
      });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const x = authError(e);
    return NextResponse.json({ error: x.message }, { status: x.status });
  }
}
