import { describe, expect, it } from "vitest";
import {
  buildProductionApplyCommand,
  buildProductionDryRunCommand,
  buildProductionMigrationListCommand,
  hasAppliedProductionMigrations,
  isExpectedProductionDryRun,
} from "../scripts/production-migration-dry-run-policy";

describe("production migration dry-run policy", () => {
  it("builds only a Supabase db push dry-run command", () => {
    const command = buildProductionDryRunCommand("postgresql://example.invalid/database");

    expect(command).toEqual([
      "supabase",
      "db",
      "push",
      "--db-url",
      "postgresql://example.invalid/database",
      "--dry-run",
    ]);
    expect(command).toContain("--dry-run");
    expect(command).not.toContain("--linked");
    expect(command).not.toContain("--include-all");
    expect(command).not.toContain("--include-seed");
  });

  it("accepts only migrations 012 and 013", () => {
    expect(
      isExpectedProductionDryRun(
        `Would push these migrations:\n012_presigned_uploads_and_edition_audit.sql\n013_harden_pending_uploads_and_rate_limits.sql`,
      ),
    ).toBe(true);
    expect(
      isExpectedProductionDryRun(
        `Would push these migrations:\n011_fix_editorial_validation_trigger.sql\n012_presigned_uploads_and_edition_audit.sql\n013_harden_pending_uploads_and_rate_limits.sql`,
      ),
    ).toBe(false);
  });

  it("builds apply and verification commands without destructive flags", () => {
    const apply = buildProductionApplyCommand("postgresql://example.invalid/database");
    const verify = buildProductionMigrationListCommand("postgresql://example.invalid/database");
    expect(apply).toEqual([
      "supabase",
      "db",
      "push",
      "--db-url",
      "postgresql://example.invalid/database",
    ]);
    expect(apply).not.toContain("reset");
    expect(apply).not.toContain("repair");
    expect(apply).not.toContain("--include-seed");
    expect(verify.slice(0, 3)).toEqual(["supabase", "migration", "list"]);
  });

  it("requires both 012 and 013 in remote migration history", () => {
    expect(hasAppliedProductionMigrations("012 | 012 | 012\n013 | 013 | 013")).toBe(true);
    expect(hasAppliedProductionMigrations("012 | 012 | 012\n013 |     | 013")).toBe(false);
  });
});
