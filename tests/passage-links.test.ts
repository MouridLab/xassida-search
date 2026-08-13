import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  absolutePassageUrl,
  askSourceHref,
  passageHref,
  resolveInitialPassage,
} from "../lib/passage-links";
import type { ReadingProgress } from "../lib/reading-progress";

const chunks = [
  { id: "chunk-1", page_number: 1 },
  { id: "chunk-2", page_number: 2 },
];
const progress: ReadingProgress = {
  version: 1,
  khassidaId: "work-1",
  slug: "massalik",
  title: "Massalik",
  passageId: "chunk-2",
  passageIndex: 1,
  page: 2,
  activeTab: "lecture",
  fontSize: 29,
  updatedAt: "2026-08-13T10:00:00.000Z",
};

describe("passage deep links", () => {
  it("opens a valid URL passage and gives it priority over local progress", () => {
    expect(resolveInitialPassage("chunk-1", chunks, progress)).toEqual({ index: 0, source: "url" });
  });

  it("ignores a missing passage and keeps normal local restoration", () => {
    expect(resolveInitialPassage("removed", chunks, progress)).toEqual({
      index: 1,
      source: "progress",
    });
  });

  it("does not crash without a parameter or local progress", () => {
    expect(resolveInitialPassage(undefined, chunks, null)).toEqual({ index: 0, source: "default" });
  });

  it("generates encoded relative and absolute passage links", () => {
    expect(passageHref("slug avec espace", "chunk/épreuve ?")).toBe(
      "/khassidas/slug%20avec%20espace?passage=chunk%2F%C3%A9preuve%20%3F",
    );
    expect(absolutePassageUrl("https://admin.example", "massalik", "chunk-2")).toBe(
      "https://admin.example/khassidas/massalik?passage=chunk-2",
    );
  });

  it("links AskInterface sources to their exact chunk when available", () => {
    expect(askSourceHref({ slug: "massalik", chunk_id: "chunk-2" })).toBe(
      "/khassidas/massalik?passage=chunk-2",
    );
    expect(askSourceHref({ slug: "massalik" })).toBe("/khassidas/massalik");
    expect(readFileSync("components/ai/AskInterface.tsx", "utf8")).toContain(
      "href={askSourceHref(source)}",
    );
  });
});
