import type { ReadingProgress } from "@/lib/reading-progress";

type Passage = { id: string; page_number: number | null };

export type InitialPassage = {
  index: number;
  source: "url" | "progress" | "default";
};

export function resolveInitialPassage(
  requestedPassageId: string | undefined,
  chunks: Passage[],
  progress: ReadingProgress | null,
): InitialPassage {
  if (requestedPassageId) {
    const requestedIndex = chunks.findIndex((chunk) => chunk.id === requestedPassageId);
    if (requestedIndex >= 0) return { index: requestedIndex, source: "url" };
  }

  if (progress) {
    const passageIndex = progress.passageId
      ? chunks.findIndex((chunk) => chunk.id === progress.passageId)
      : -1;
    if (passageIndex >= 0) return { index: passageIndex, source: "progress" };
    const pageIndex = progress.page
      ? chunks.findIndex((chunk) => chunk.page_number === progress.page)
      : -1;
    return { index: pageIndex >= 0 ? pageIndex : 0, source: "progress" };
  }

  return { index: 0, source: "default" };
}

export function passageHref(slug: string, passageId: string): string {
  return `/khassidas/${encodeURIComponent(slug)}?passage=${encodeURIComponent(passageId)}`;
}

export function absolutePassageUrl(origin: string, slug: string, passageId: string): string {
  return new URL(passageHref(slug, passageId), origin).toString();
}

export function askSourceHref(source: {
  slug?: string;
  chunk_id?: string;
}): string {
  if (!source.slug) return "/khassidas";
  return source.chunk_id
    ? passageHref(source.slug, source.chunk_id)
    : `/khassidas/${encodeURIComponent(source.slug)}`;
}
