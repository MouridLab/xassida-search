import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  parseGeneratedAnswer,
  resultPayload,
  SYSTEM_PROMPT,
} from "../services/autorag/rag-response";

const passage = {
  id: "chunk-1",
  source: "/data/corpus/123e4567-e89b-42d3-a456-426614174000.md",
  score: 1,
  metadata: {},
  content:
    "# Matlaboul Fawzeyni\n\nChunk-ID: 123e4567-e89b-42d3-a456-426614174000\n\n## Traduction française\nTouba est évoquée dans ce passage.",
};

describe("optimized local RAG response", () => {
  it("builds one bounded, source-numbered prompt without requesting reasoning", () => {
    const prompt = buildPrompt("Quels passages parlent de Touba ?", [passage]);

    expect(prompt).toContain("/no_think");
    expect(prompt).toContain("[1] Source:");
    expect(prompt).toContain("Quels passages parlent de Touba ?");
    expect(SYSTEM_PROMPT).toContain("Ne décris jamais ton raisonnement");
  });

  it("preserves the AutoRAG source used for verified chunk mapping", () => {
    expect(resultPayload([passage])).toEqual([
      expect.objectContaining({
        number: 1,
        title: "Matlaboul Fawzeyni",
        source: passage.source,
      }),
    ]);
  });

  it("accepts only a structured non-empty final answer", () => {
    expect(parseGeneratedAnswer('{"answer":"Réponse française [1]."}')).toBe(
      "Réponse française [1].",
    );
    expect(parseGeneratedAnswer("unstructured reasoning")).toBeNull();
    expect(parseGeneratedAnswer('{"answer":""}')).toBeNull();
  });
});
