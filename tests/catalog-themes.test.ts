import { describe, expect, it } from "vitest";
import { normalizeTheme, uniqueThemeOptions } from "../lib/catalog-themes";

describe("catalog theme normalization", () => {
  it("merges visually identical themes", () => {
    expect(normalizeTheme("didactique")).toBe(normalizeTheme("  DIDACTIQUE\u00a0"));
  });

  it("normalizes equivalent Unicode spellings", () => {
    expect(normalizeTheme("e\u0301ducation")).toBe(normalizeTheme("éducation"));
  });

  it("removes zero-width and directional characters from duplicate labels", () => {
    expect(uniqueThemeOptions(["didactique", "dida\u200bctique", "\u200fdidactique"])).toEqual([
      ["didactique", "didactique"],
    ]);
  });
});
