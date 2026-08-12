import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/008_pending_profile_role.sql"),
  "utf8",
).toLowerCase();
const baseSchema = readFileSync(
  resolve(process.cwd(), "supabase/migrations/001_v2_schema.sql"),
  "utf8",
).toLowerCase();
const mediaMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/009_atomic_primary_media.sql"),
  "utf8",
).toLowerCase();
const validationMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/010_enforce_editorial_validation.sql"),
  "utf8",
).toLowerCase();
const validationFixMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/011_fix_editorial_validation_trigger.sql"),
  "utf8",
).toLowerCase();

describe("non-privileged profile bootstrap migration", () => {
  it("uses pending for the column default and user bootstrap", () => {
    expect(migration).toContain("alter column role set default 'pending'");
    expect(migration).toMatch(/values\s*\([\s\S]*?'pending'[\s\S]*?\)/);
  });

  it("preserves privileged roles without mass-updating existing profiles", () => {
    expect(migration).toContain("'pending', 'editor', 'validator', 'admin'");
    expect(migration).not.toMatch(/update\s+public\.profiles\s+set\s+role/);
  });

  it("keeps direct RLS mutations restricted to is_staff", () => {
    expect(baseSchema).toContain("with check (public.is_staff())");
    expect(baseSchema).toContain("role in ('editor','validator','admin')");
    expect(baseSchema).not.toContain("role in ('pending','editor','validator','admin')");
  });

  it("reserves the atomic media RPC to the service role", () => {
    expect(mediaMigration).toContain("revoke all on function public.replace_primary_media");
    expect(mediaMigration).toContain("grant execute on function public.replace_primary_media");
    expect(mediaMigration).toContain("to service_role");
  });

  it("enforces validator permission for every public editorial status", () => {
    for (const table of ["khassidas", "khassida_chunks", "library_items", "khassida_editions"])
      expect(validationMigration).toContain(`on public.${table}`);
    expect(validationMigration).toContain("not public.can_validate()");
    expect(validationMigration).toContain("auth.role(), '') <> 'service_role'");
    expect(validationFixMigration).toContain("to_jsonb(new)");
    expect(validationFixMigration).not.toContain("new.validation_status");
  });
});
