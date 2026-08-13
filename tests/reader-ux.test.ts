import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reader = readFileSync("components/ReaderView.tsx", "utf8");

describe("reader UX safeguards", () => {
  it("never enables audio autoplay", () => {
    expect(reader).not.toMatch(/<audio[^>]*autoPlay/);
    expect(reader).not.toMatch(/<iframe[^>]*autoplay=1/);
  });

  it("keeps passage deep-links and persisted progress wired", () => {
    expect(reader).toContain("initialPassageId");
    expect(reader).toContain("absolutePassageUrl");
    expect(reader).toContain("saveReadingProgress");
    expect(reader).toContain("validAudioPosition");
  });

  it("offers an immersive PDF view and persistent audio controls", () => {
    expect(reader).toContain("Lecture PDF");
    expect(reader).toContain("CompactAudioBar");
    expect(reader).toContain("playbackRate");
  });
});
