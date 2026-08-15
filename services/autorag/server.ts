import { BM25Method } from "@autorag/librarian";
import {
  buildPrompt,
  parseGeneratedAnswer,
  resultPayload,
  SYSTEM_PROMPT,
} from "./rag-response";

const port = Number(process.env.PORT || 8080);
const token = process.env.AUTORAG_INTERNAL_TOKEN;
const workspace = process.env.AUTORAG_WORKSPACE_PATH || "/data/workspace";
const ollamaUrl = process.env.OLLAMA_URL || "http://ollama:11434";
const model = process.env.OLLAMA_MODEL || "qwen3:4b";
if (!token) throw new Error("AUTORAG_INTERNAL_TOKEN is required");

let busy = false;
const retrieval = new BM25Method({ root: workspace, fallback: "typescript" });

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true, busy });
    if (url.pathname !== "/search" || request.method !== "POST")
      return Response.json({ error: "Not found" }, { status: 404 });
    if (request.headers.get("authorization") !== `Bearer ${token}`)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (busy) return Response.json({ error: "Busy" }, { status: 429 });
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2048) return Response.json({ error: "Payload too large" }, { status: 413 });
    const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (question.length < 5 || question.length > 500)
      return Response.json({ error: "Invalid question" }, { status: 400 });
    busy = true;
    try {
      const passages = await retrieval.retrieve(question, { topK: 4 });
      if (!passages.length) return Response.json({ answer: "", results: [] });
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          format: {
            type: "object",
            properties: { answer: { type: "string" } },
            required: ["answer"],
          },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(question, passages) },
          ],
          options: { temperature: 0, num_ctx: 4096, num_predict: 140 },
        }),
        signal: AbortSignal.timeout(75_000),
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const generated = (await response.json()) as { message?: { content?: unknown } };
      const answer = parseGeneratedAnswer(generated.message?.content);
      if (!answer) throw new Error("Ollama returned an empty answer");
      return Response.json({ answer, results: resultPayload(passages) });
    } catch (error) {
      console.error("Local RAG search failed", safeDiagnostic(error));
      return Response.json({ error: "AutoRAG unavailable" }, { status: 502 });
    } finally {
      busy = false;
    }
  },
});

function safeDiagnostic(value: unknown) {
  const message = value instanceof Error ? value.message : String(value);
  return message.replaceAll(token, "[redacted]").slice(0, 500);
}
