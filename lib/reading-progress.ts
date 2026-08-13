export const READING_PROGRESS_STORAGE_KEY = "xassida-search:reading-progress";
export const READING_PROGRESS_VERSION = 1;

export type ReadingProgress = {
  version: 1;
  khassidaId: string;
  slug: string;
  title: string;
  passageId?: string;
  passageIndex?: number;
  page?: number;
  activeTab: "lecture" | "audio";
  audioPosition?: number;
  audioUrl?: string;
  fontSize: number;
  updatedAt: string;
};

type ReadingProgressStore = {
  version: 1;
  items: Record<string, ReadingProgress>;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const emptyStore = (): ReadingProgressStore => ({ version: 1, items: {} });

export function parseReadingProgressStore(value: string | null): ReadingProgressStore {
  if (!value) return emptyStore();
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed) || parsed.version !== READING_PROGRESS_VERSION || !isRecord(parsed.items))
      return emptyStore();
    const items: Record<string, ReadingProgress> = {};
    for (const candidate of Object.values(parsed.items)) {
      const progress = validateReadingProgress(candidate);
      if (progress) items[progress.khassidaId] = progress;
    }
    return { version: 1, items };
  } catch {
    return emptyStore();
  }
}

export function readReadingProgress(
  storage: StorageLike | null | undefined,
  khassidaId: string,
): ReadingProgress | null {
  if (!storage) return null;
  try {
    return (
      parseReadingProgressStore(storage.getItem(READING_PROGRESS_STORAGE_KEY)).items[khassidaId] ??
      null
    );
  } catch {
    return null;
  }
}

export function readLatestReadingProgress(
  storage: StorageLike | null | undefined,
): ReadingProgress | null {
  if (!storage) return null;
  try {
    return (
      Object.values(
        parseReadingProgressStore(storage.getItem(READING_PROGRESS_STORAGE_KEY)).items,
      ).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null
    );
  } catch {
    return null;
  }
}

export function saveReadingProgress(
  storage: StorageLike | null | undefined,
  progress: ReadingProgress,
): boolean {
  if (!storage || !validateReadingProgress(progress)) return false;
  try {
    const store = parseReadingProgressStore(storage.getItem(READING_PROGRESS_STORAGE_KEY));
    store.items[progress.khassidaId] = progress;
    storage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function resolvePassageIndex(
  progress: ReadingProgress,
  chunks: Array<{ id: string; page_number: number | null }>,
): number {
  const byId = progress.passageId
    ? chunks.findIndex((chunk) => chunk.id === progress.passageId)
    : -1;
  if (byId >= 0) return byId;
  const byPage = progress.page
    ? chunks.findIndex((chunk) => chunk.page_number === progress.page)
    : -1;
  return byPage >= 0 ? byPage : 0;
}

export function validAudioPosition(
  progress: ReadingProgress,
  audioUrl: string | null | undefined,
  duration: number,
): number | null {
  if (
    !audioUrl ||
    progress.audioUrl !== audioUrl ||
    !Number.isFinite(progress.audioPosition) ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    return null;
  const position = progress.audioPosition ?? 0;
  return position >= 0 && position < duration ? position : null;
}

export function hasUsefulReadingProgress(progress: ReadingProgress | null): boolean {
  if (!progress) return false;
  return Boolean(
    (progress.passageIndex ?? 0) > 0 ||
    progress.activeTab === "audio" ||
    (progress.audioPosition ?? 0) >= 5 ||
    progress.fontSize !== 32,
  );
}

function validateReadingProgress(value: unknown): ReadingProgress | null {
  if (!isRecord(value)) return null;
  if (
    value.version !== READING_PROGRESS_VERSION ||
    !nonEmptyString(value.khassidaId) ||
    !nonEmptyString(value.slug) ||
    !nonEmptyString(value.title) ||
    !["lecture", "audio"].includes(String(value.activeTab)) ||
    !Number.isFinite(value.fontSize) ||
    Number(value.fontSize) < 20 ||
    Number(value.fontSize) > 44 ||
    !nonEmptyString(value.updatedAt) ||
    !Number.isFinite(Date.parse(String(value.updatedAt)))
  )
    return null;
  if (value.passageId !== undefined && !nonEmptyString(value.passageId)) return null;
  if (
    value.passageIndex !== undefined &&
    (!Number.isInteger(value.passageIndex) || Number(value.passageIndex) < 0)
  )
    return null;
  if (value.audioUrl !== undefined && !nonEmptyString(value.audioUrl)) return null;
  if (value.page !== undefined && (!Number.isInteger(value.page) || Number(value.page) < 1))
    return null;
  if (
    value.audioPosition !== undefined &&
    (!Number.isFinite(value.audioPosition) || Number(value.audioPosition) < 0)
  )
    return null;
  return value as ReadingProgress;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
