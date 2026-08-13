import { describe, expect, it } from "vitest";
import {
  READING_PROGRESS_STORAGE_KEY,
  readReadingProgress,
  resolvePassageIndex,
  saveReadingProgress,
  validAudioPosition,
  type ReadingProgress,
  type StorageLike,
} from "../lib/reading-progress";

const progress: ReadingProgress = {
  version: 1,
  khassidaId: "work-1",
  slug: "massalik",
  title: "Massalik",
  passageId: "chunk-2",
  passageIndex: 1,
  page: 4,
  activeTab: "audio",
  audioPosition: 32,
  audioUrl: "/audio.mp3",
  fontSize: 31,
  updatedAt: "2026-08-13T10:00:00.000Z",
};

function memoryStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

describe("reading progress", () => {
  it("saves and restores a versioned progress entry", () => {
    const storage = memoryStorage();
    expect(saveReadingProgress(storage, progress)).toBe(true);
    expect(JSON.parse(storage.value!).version).toBe(1);
    expect(readReadingProgress(storage, "work-1")).toEqual(progress);
  });

  it("ignores corrupted data and unknown versions", () => {
    expect(readReadingProgress(memoryStorage("not-json"), "work-1")).toBeNull();
    expect(
      readReadingProgress(memoryStorage(JSON.stringify({ version: 2, items: {} })), "work-1"),
    ).toBeNull();
  });

  it("does not return another work progress", () => {
    const storage = memoryStorage();
    saveReadingProgress(storage, progress);
    expect(readReadingProgress(storage, "work-2")).toBeNull();
  });

  it("resolves a passage by id, then page, and safely falls back", () => {
    const chunks = [
      { id: "chunk-1", page_number: 3 },
      { id: "chunk-2", page_number: 4 },
    ];
    expect(resolvePassageIndex(progress, chunks)).toBe(1);
    expect(resolvePassageIndex({ ...progress, passageId: "removed" }, chunks)).toBe(1);
    expect(resolvePassageIndex({ ...progress, passageId: "removed", page: 99 }, chunks)).toBe(0);
  });

  it("restores only a valid position for the same audio", () => {
    expect(validAudioPosition(progress, "/audio.mp3", 100)).toBe(32);
    expect(validAudioPosition({ ...progress, audioPosition: 120 }, "/audio.mp3", 100)).toBeNull();
    expect(validAudioPosition(progress, "/changed.mp3", 100)).toBeNull();
  });

  it("handles unavailable storage", () => {
    expect(readReadingProgress(null, "work-1")).toBeNull();
    expect(saveReadingProgress(null, progress)).toBe(false);
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readReadingProgress(throwing, "work-1")).toBeNull();
    expect(saveReadingProgress(throwing, progress)).toBe(false);
  });

  it("uses the expected storage key", () => {
    expect(READING_PROGRESS_STORAGE_KEY).toBe("xassida-search:reading-progress");
  });

  it("persists comfortable reader font levels including very large text", () => {
    const storage = memoryStorage();
    const veryLarge = { ...progress, fontSize: 44 };
    expect(saveReadingProgress(storage, veryLarge)).toBe(true);
    expect(readReadingProgress(storage, "work-1")?.fontSize).toBe(44);
  });
});
