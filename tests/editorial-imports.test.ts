import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const xassaidImport = readFileSync(resolve(process.cwd(), "scripts/import-xassaid.ts"), "utf8");
const librarySeed = readFileSync(resolve(process.cwd(), "scripts/seed-library.ts"), "utf8");
const khassidaSeed = readFileSync(resolve(process.cwd(), "supabase/seed.sql"), "utf8");

describe("automated editorial imports", () => {
  it("imports extracted passages into review and preserves verified rows", () => {
    expect(xassaidImport).toContain('validation_status:"review"');
    expect(xassaidImport).toContain('.neq("validation_status","verified")');
    expect(xassaidImport).not.toContain('validation_status:"verified"');
  });

  it("does not automatically verify library resources", () => {
    expect(librarySeed).not.toMatch(/is_verified\s*:\s*true/);
  });

  it("keeps the initial khassida catalog idempotent and unpublished", () => {
    expect(khassidaSeed).toContain("on conflict(slug) do nothing");
    expect(khassidaSeed).not.toMatch(/,true\)/);
    expect(khassidaSeed).not.toContain("insert into public.khassida_chunks");
  });
});
