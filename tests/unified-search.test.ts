import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  highlightSegments,
  mapUnifiedSearchRow,
  unifiedSearchParamsSchema,
  type UnifiedSearchRpcRow,
} from "../lib/unified-search";
import { normalizeSearch } from "../lib/normalize";

const row: UnifiedSearchRpcRow = {
  result_type: "passage",
  id: "chunk/épreuve",
  title: "Massalik",
  slug: "massalik test",
  subtitle: null,
  excerpt: "La patience guide le chemin.",
  khassida_id: "work-1",
  page_number: 4,
  chapter_number: 2,
  verse_start: 7,
  verse_end: 8,
  matched_field: "translation",
  rank_score: 55,
  total_count: 31,
};

describe("unified search contract", () => {
  it("maps a passage to the existing encoded deep-link format", () => {
    expect(mapUnifiedSearchRow(row)).toMatchObject({
      type: "passage",
      href: "/khassidas/massalik%20test?passage=chunk%2F%C3%A9preuve",
      chapter: 2,
      verseStart: 7,
      page: 4,
    });
  });

  it("validates query length, filters and bounded pagination", () => {
    expect(unifiedSearchParamsSchema.safeParse({ q: "" }).success).toBe(false);
    expect(unifiedSearchParamsSchema.safeParse({ q: "x" }).success).toBe(false);
    expect(unifiedSearchParamsSchema.safeParse({ q: "x".repeat(121) }).success).toBe(false);
    expect(
      unifiedSearchParamsSchema.parse({ q: "Touba", type: "passage", page: "2", limit: "15" }),
    ).toMatchObject({ q: "Touba", type: "passage", page: 2, limit: 15 });
    expect(unifiedSearchParamsSchema.safeParse({ q: "Touba", limit: 100 }).success).toBe(false);
  });

  it("highlights normalized French and transcription without unsafe HTML", () => {
    expect(highlightSegments("Éducation et patience", "education")).toEqual([
      { text: "Éducation", highlighted: true },
      { text: " et patience", highlighted: false },
    ]);
    expect(highlightSegments("Maa ngi dem", "ma ngi").some((part) => part.highlighted)).toBe(true);
  });

  it("does not map normalized Arabic positions onto the original text", () => {
    expect(highlightSegments("الصَّبْرُ", "الصبر")).toEqual([
      { text: "الصَّبْرُ", highlighted: false },
    ]);
  });

  it("covers all real searchable fields and excludes unpublished content in SQL", () => {
    const sql = readFileSync("supabase/migrations/014_unified_multilingual_search.sql", "utf8");
    for (const field of [
      "k.title",
      "k.arabic_title",
      "k.transcription",
      "k.aliases",
      "k.themes",
      "c.arabic_text",
      "c.normalized_arabic",
      "c.transcription",
      "c.french_translation",
      "c.commentary",
      "l.title",
      "l.author",
      "l.description",
      "l.themes",
    ]) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("c.validation_status = 'verified'");
    expect(sql).toContain("k.is_verified");
    expect(sql).toContain("l.is_verified");
    expect(sql).toContain("count(*) over () total_count");
  });

  it("uses the documented deterministic ranking order", () => {
    const sql = readFileSync("supabase/migrations/014_unified_multilingual_search.sql", "utf8");
    for (const score of [100, 90, 85, 80, 70, 60, 55, 45, 40, 35]) {
      expect(sql).toContain(`then ${score}`);
    }
    expect(sql).toContain("else 50");
    expect(sql).toContain("else 30");
    expect(sql).toContain("order by rank_score desc, title asc, id asc");
  });

  it("normalizes Arabic, transcription and French queries consistently", () => {
    expect(normalizeSearch("الصَّبْرُ")).toBe(normalizeSearch("الصبر"));
    expect(normalizeSearch("Maa ngi dem")).toBe(normalizeSearch("ma ngi dem"));
    expect(normalizeSearch("Éducation")).toBe(normalizeSearch("education"));
  });

  it("keeps indexed search expressions aligned with the SQL predicates", () => {
    const sql = readFileSync("supabase/migrations/014_unified_multilingual_search.sql", "utf8");
    expect(sql).not.toContain("normalize_public_search(concat_ws");
    expect(sql).toContain("coalesce(c.normalized_arabic");
    expect(sql).toContain("coalesce(c.normalized_transcription");
    expect(sql).toContain("chunks_translation_trgm_idx");
    expect(sql).toContain("chunks_commentary_trgm_idx");
  });
});
