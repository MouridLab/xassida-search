import type { RetrievalResult } from "@autorag/librarian";

const MAX_CONTEXT_CHARS = 500;

export function buildPrompt(question: string, passages: RetrievalResult[]) {
  const context = passages
    .map(
      (passage, index) =>
        `[${index + 1}] Source: ${passage.source}\n${passage.content.slice(0, MAX_CONTEXT_CHARS)}`,
    )
    .join("\n\n");

  return `Question : ${question}\n\nPassages :\n${context}\n\nRéponds maintenant. /no_think`;
}

export const SYSTEM_PROMPT =
  "Tu es un assistant documentaire francophone. Place uniquement la réponse finale en français dans le champ JSON answer, en 3 phrases maximum, à partir des passages fournis. Cite chaque fait avec [1], [2], etc. Ne décris jamais ton raisonnement, ton analyse ou tes étapes. Si les passages ne suffisent pas, dis-le clairement. N'invente rien.";

export function parseGeneratedAnswer(content: unknown) {
  if (typeof content !== "string") return null;
  try {
    const value = JSON.parse(content) as { answer?: unknown };
    return typeof value.answer === "string" && value.answer.trim() ? value.answer.trim() : null;
  } catch {
    return null;
  }
}

export function resultPayload(passages: RetrievalResult[]) {
  return passages.map((passage, index) => ({
    number: index + 1,
    title: titleFromContent(passage.content),
    summary: summaryFromContent(passage.content),
    source: passage.source,
  }));
}

function titleFromContent(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Passage du corpus";
}

function summaryFromContent(content: string) {
  return content
    .replace(/^#.*$/gm, "")
    .replace(/^(Chunk-ID|Slug|Chapitre|Vers|Page):.*$/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}
