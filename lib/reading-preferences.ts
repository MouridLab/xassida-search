export const READING_PREFERENCES_STORAGE_KEY = "xassida-search:reading-preferences";

export type ReadingPreferences = {
  showTranscription: boolean;
  showTranslation: boolean;
  lineHeight: "compact" | "comfortable";
};

export const defaultReadingPreferences: ReadingPreferences = {
  showTranscription: true,
  showTranslation: true,
  lineHeight: "comfortable",
};

export function readReadingPreferences(storage: Pick<Storage, "getItem">): ReadingPreferences {
  try {
    const parsed = JSON.parse(storage.getItem(READING_PREFERENCES_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultReadingPreferences;
    return {
      showTranscription:
        typeof parsed.showTranscription === "boolean" ? parsed.showTranscription : true,
      showTranslation: typeof parsed.showTranslation === "boolean" ? parsed.showTranslation : true,
      lineHeight: parsed.lineHeight === "compact" ? "compact" : "comfortable",
    };
  } catch {
    return defaultReadingPreferences;
  }
}

export function saveReadingPreferences(
  storage: Pick<Storage, "setItem">,
  preferences: ReadingPreferences,
) {
  storage.setItem(READING_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
