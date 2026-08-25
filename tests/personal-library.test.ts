import { describe, expect, it } from "vitest";
import { FAVORITES_STORAGE_KEY, readFavorites, toggleFavorite } from "../lib/favorites";
import {
  defaultReadingPreferences,
  readReadingPreferences,
  saveReadingPreferences,
} from "../lib/reading-preferences";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("personal library", () => {
  it("adds and removes a favorite without duplicates", () => {
    const storage = memoryStorage();
    const work = { id: "work-1", slug: "massalik", title: "Massalik", arabicTitle: "مسالك" };
    expect(toggleFavorite(storage, work)).toBe(true);
    expect(readFavorites(storage)).toHaveLength(1);
    expect(readFavorites(storage)[0]).toMatchObject(work);
    expect(toggleFavorite(storage, work)).toBe(false);
    expect(readFavorites(storage)).toEqual([]);
  });

  it("ignores malformed favorite data", () => {
    const storage = memoryStorage({ [FAVORITES_STORAGE_KEY]: "not-json" });
    expect(readFavorites(storage)).toEqual([]);
  });

  it("persists reader display preferences", () => {
    const storage = memoryStorage();
    const preferences = {
      showTranscription: false,
      showTranslation: true,
      lineHeight: "compact" as const,
    };
    saveReadingPreferences(storage, preferences);
    expect(readReadingPreferences(storage)).toEqual(preferences);
  });

  it("falls back safely when reader preferences are malformed", () => {
    const storage = memoryStorage({ "xassida-search:reading-preferences": "{" });
    expect(readReadingPreferences(storage)).toEqual(defaultReadingPreferences);
  });
});
