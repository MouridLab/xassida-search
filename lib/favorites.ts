export const FAVORITES_STORAGE_KEY = "xassida-search:favorites";

export type FavoriteWork = {
  id: string;
  slug: string;
  title: string;
  arabicTitle?: string | null;
  savedAt: string;
};

export function readFavorites(storage: Pick<Storage, "getItem">): FavoriteWork[] {
  try {
    const parsed = JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FavoriteWork =>
      Boolean(
        item &&
        typeof item.id === "string" &&
        typeof item.slug === "string" &&
        typeof item.title === "string" &&
        typeof item.savedAt === "string",
      ),
    );
  } catch {
    return [];
  }
}

export function toggleFavorite(
  storage: Pick<Storage, "getItem" | "setItem">,
  work: Omit<FavoriteWork, "savedAt">,
) {
  const favorites = readFavorites(storage);
  const exists = favorites.some((item) => item.id === work.id);
  const next = exists
    ? favorites.filter((item) => item.id !== work.id)
    : [{ ...work, savedAt: new Date().toISOString() }, ...favorites];
  storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  return !exists;
}
