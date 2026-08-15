import { NextResponse } from "next/server";
import {
  askConcurrencyGate,
  askInput,
  ASK_MAX_BODY_BYTES,
  ASK_TIMEOUT_MS,
  askRateLimiter,
} from "@/lib/ask-policy";
import { requestClientKey } from "@/lib/api-abuse";
import { askAutoRag, chunkIdFromAutoRagSource } from "@/lib/autorag";
import { isConfigured, publicServerClient } from "@/lib/supabase";

const fallback = "Je n’ai pas trouvé de passage validé permettant de répondre précisément.";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > ASK_MAX_BODY_BYTES)
    return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
  const rawBody = await request.text().catch(() => "");
  if (new TextEncoder().encode(rawBody).byteLength > ASK_MAX_BODY_BYTES)
    return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
  const parsed = askInput.safeParse(parseJson(rawBody));
  if (!parsed.success) return NextResponse.json({ error: "Question invalide." }, { status: 400 });
  if (!isConfigured)
    return NextResponse.json({ error: "Supabase n’est pas configuré." }, { status: 503 });
  if (!process.env.AUTORAG_SERVICE_URL || !process.env.AUTORAG_INTERNAL_TOKEN)
    return NextResponse.json(
      { error: "Le service RAG local n’est pas configuré." },
      { status: 503 },
    );

  let rate;
  try {
    rate = await askRateLimiter.consume(`ask:${requestClientKey(request)}`);
  } catch {
    return NextResponse.json({ error: "Le contrôle de quota est indisponible." }, { status: 503 });
  }
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Trop de questions. Réessayez dans quelques instants." },
      { status: 429, headers: { "retry-after": String(rate.retryAfter) } },
    );
  if (!askConcurrencyGate.tryAcquire())
    return NextResponse.json(
      { error: "Le service est momentanément occupé." },
      { status: 429, headers: { "retry-after": "5" } },
    );

  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(ASK_TIMEOUT_MS)]);
    const rag = await askAutoRag(parsed.data.question, signal);
    const rankedIds = rag.results
      .map((result) => chunkIdFromAutoRagSource(result.source))
      .filter((id): id is string => Boolean(id));
    if (!rankedIds.length) return NextResponse.json({ answer: fallback, sources: [] });
    const db = publicServerClient();
    const { data: chunks, error } = await db
      .from("khassida_chunks")
      .select(
        "id,khassida_id,arabic_text,transcription,french_translation,chapter_number,verse_start,verse_end,page_number,source_pdf_url,audio_url",
      )
      .in("id", rankedIds)
      .eq("validation_status", "verified");
    if (error) throw new Error("RETRIEVAL_FAILED");
    const workIds = [...new Set((chunks || []).map((chunk) => chunk.khassida_id))];
    const { data: works, error: worksError } = await db
      .from("khassidas")
      .select("id,title,slug,pdf_url,audio_url")
      .in("id", workIds)
      .eq("is_verified", true);
    if (worksError) throw new Error("RETRIEVAL_FAILED");
    const chunksById = new Map((chunks || []).map((chunk) => [chunk.id, chunk]));
    const worksById = new Map((works || []).map((work) => [work.id, work]));
    const sources = rankedIds.flatMap((id) => {
      const chunk = chunksById.get(id);
      if (!chunk) return [];
      const work = worksById.get(chunk.khassida_id);
      if (!work) return [];
      return [
        {
          id: chunk.id,
          chunk_id: chunk.id,
          title: work.title,
          slug: work.slug,
          quote: chunk.french_translation || chunk.arabic_text || chunk.transcription || "",
          arabic_text: chunk.arabic_text,
          transcription: chunk.transcription,
          french_translation: chunk.french_translation,
          reference: referenceFor(chunk),
          pdf_url: work.pdf_url || chunk.source_pdf_url,
          audio_url: work.audio_url || chunk.audio_url,
        },
      ];
    });
    if (!sources.length) return NextResponse.json({ answer: fallback, sources: [] });
    return NextResponse.json({ answer: rag.answer || fallback, sources });
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === "AbortError" || /timeout/i.test(error.message));
    return NextResponse.json(
      {
        error: timedOut
          ? "Le service IA a dépassé le délai autorisé."
          : "Le service IA est temporairement indisponible.",
      },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    askConcurrencyGate.release();
  }
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function referenceFor(chunk: {
  chapter_number?: number | null;
  verse_start?: number | null;
  verse_end?: number | null;
  page_number?: number | null;
}) {
  return (
    [
      chunk.chapter_number && `chapitre ${chunk.chapter_number}`,
      chunk.verse_start &&
        `vers ${chunk.verse_start}${chunk.verse_end ? `–${chunk.verse_end}` : ""}`,
      chunk.page_number && `page ${chunk.page_number}`,
    ]
      .filter(Boolean)
      .join(", ") || "référence à compléter"
  );
}
