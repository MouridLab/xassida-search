import { z } from "zod";
import { normalizeSearch } from "./normalize";
import { passageHref } from "./passage-links";

export const searchTypes = ["all", "khassida", "passage", "library"] as const;
export type SearchType = (typeof searchTypes)[number];

export const unifiedSearchParamsSchema = z.object({
  q: z.string().trim().min(2).max(120),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(15),
  type: z.enum(searchTypes).default("all"),
  theme: z.string().trim().max(60).optional(),
});

export type UnifiedSearchResult = {
  type: "khassida" | "passage" | "library";
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  excerpt?: string;
  href: string;
  matchedField?: string;
  khassidaId?: string;
  page?: number;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  score: number;
};

export type UnifiedSearchRpcRow = {
  result_type: "khassida" | "passage" | "library";
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  khassida_id: string | null;
  page_number: number | null;
  chapter_number: number | null;
  verse_start: number | null;
  verse_end: number | null;
  matched_field: string | null;
  rank_score: number;
  total_count: number;
};

export function mapUnifiedSearchRow(row: UnifiedSearchRpcRow): UnifiedSearchResult {
  return {
    type: row.result_type,
    id: row.id,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle || undefined,
    excerpt: row.excerpt || undefined,
    href:
      row.result_type === "passage"
        ? passageHref(row.slug, row.id)
        : row.result_type === "library"
          ? `/bibliotheque/${encodeURIComponent(row.slug)}`
          : `/khassidas/${encodeURIComponent(row.slug)}`,
    matchedField: row.matched_field || undefined,
    khassidaId: row.khassida_id || undefined,
    page: row.page_number || undefined,
    chapter: row.chapter_number || undefined,
    verseStart: row.verse_start || undefined,
    verseEnd: row.verse_end || undefined,
    score: row.rank_score,
  };
}

export type HighlightSegment = { text: string; highlighted: boolean };

export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const needle = normalizeSearch(query);
  if (!text || !needle || /[\u0600-\u06ff]/.test(query)) return [{ text, highlighted: false }];
  for (let start = 0; start < text.length; start += 1) {
    for (let end = start + 1; end <= text.length; end += 1) {
      const candidate = normalizeSearch(text.slice(start, end));
      if (candidate === needle) {
        return [
          ...(start ? [{ text: text.slice(0, start), highlighted: false }] : []),
          { text: text.slice(start, end), highlighted: true },
          ...(end < text.length ? [{ text: text.slice(end), highlighted: false }] : []),
        ];
      }
      if (candidate.length > needle.length + 2) break;
    }
  }
  return [{ text, highlighted: false }];
}
