import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  askConcurrencyGate,
  askInput,
  ASK_MAX_BODY_BYTES,
  ASK_TIMEOUT_MS,
  askRateLimiter,
} from "@/lib/ask-policy";
import { requestClientKey } from "@/lib/api-abuse";
import { normalizeSearch } from "@/lib/normalize";
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
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "Le service RAG n’est pas configuré." }, { status: 503 });

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
    const ai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
      timeout: ASK_TIMEOUT_MS,
    });
    const embedding = await ai.embeddings.create(
      {
        model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
        input: parsed.data.question,
      },
      { signal },
    );
    const db = publicServerClient();
    const { data, error } = await db.rpc("hybrid_search", {
      query_text: normalizeSearch(parsed.data.question),
      query_embedding: embedding.data[0].embedding,
      match_count: 6,
    });
    if (error) throw new Error("RETRIEVAL_FAILED");
    if (!data?.length) return NextResponse.json({ answer: fallback, sources: [] });

    const ids = [...new Set(data.map((chunk: { khassida_id: string }) => chunk.khassida_id))];
    const { data: works, error: worksError } = await db
      .from("khassidas")
      .select("id,title,slug,pdf_url,audio_url")
      .in("id", ids);
    if (worksError) throw new Error("RETRIEVAL_FAILED");
    const worksById = new Map((works || []).map((work) => [work.id, work]));
    const sources = data.map((chunk: RagChunk, index: number) => {
      const work = worksById.get(chunk.khassida_id);
      return {
        ...chunk,
        index: index + 1,
        title: work?.title,
        slug: work?.slug,
        pdf_url: work?.pdf_url || chunk.source_pdf_url,
        audio_url: work?.audio_url || chunk.audio_url,
        quote: chunk.french_translation || chunk.arabic_text || chunk.transcription || "",
        reference:
          [
            chunk.chapter_number && `chapitre ${chunk.chapter_number}`,
            chunk.verse_start &&
              `vers ${chunk.verse_start}${chunk.verse_end ? `–${chunk.verse_end}` : ""}`,
            chunk.page_number && `page ${chunk.page_number}`,
          ]
            .filter(Boolean)
            .join(", ") || "référence à compléter",
      };
    });
    const context = sources
      .map(
        (source: (typeof sources)[number]) =>
          `[${source.index}] ${source.title} — ${source.reference}\nARABE: ${source.arabic_text || "non fourni"}\nTRANSCRIPTION: ${source.transcription || "non fournie"}\nTRADUCTION: ${source.french_translation || "non fournie"}\nCOMMENTAIRE: ${source.commentary || "non fourni"}`,
      )
      .join("\n\n");
    const completion = await ai.chat.completions.create(
      {
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
        max_completion_tokens: Number(process.env.ASK_MAX_OUTPUT_TOKENS || 600),
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Tu es l’assistant de Xassida Search. Réponds uniquement avec les passages fournis. N’invente jamais un vers, une traduction, une référence ou une attribution. Distingue original, transcription, traduction et commentaire. Une explication générée n’est jamais une parole directe de Cheikh Ahmadou Bamba. Cite chaque affirmation avec [n]. Si les sources ne suffisent pas, réponds exactement : « ${fallback} »`,
          },
          {
            role: "user",
            content: `QUESTION:\n${parsed.data.question}\n\nPASSAGES VALIDÉS:\n${context}`,
          },
        ],
      },
      { signal },
    );
    return NextResponse.json({
      answer: completion.choices[0].message.content || fallback,
      sources: sources.map((source: (typeof sources)[number]) => ({
        id: source.id,
        chunk_id: source.id,
        title: source.title,
        slug: source.slug,
        quote: source.quote,
        reference: source.reference,
        pdf_url: source.pdf_url,
        audio_url: source.audio_url,
      })),
    });
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

type RagChunk = {
  id: string;
  khassida_id: string;
  arabic_text?: string;
  french_translation?: string;
  transcription?: string;
  commentary?: string;
  source_pdf_url?: string;
  audio_url?: string;
  chapter_number?: number;
  verse_start?: number;
  verse_end?: number;
  page_number?: number;
};
