export function buildProductionDryRunCommand(databaseUrl: string): readonly string[] {
  return ["supabase", "db", "push", "--db-url", databaseUrl, "--dry-run"] as const;
}

export const expectedProductionMigrations = ["016_harden_delete_khassida.sql"] as const;

export function extractMigrationFiles(output: string): string[] {
  return [...new Set(output.match(/\b\d{3}_[a-z0-9_]+\.sql\b/gi) ?? [])].sort();
}

export function isExpectedProductionDryRun(output: string): boolean {
  const found = extractMigrationFiles(output);
  return (
    found.length === expectedProductionMigrations.length &&
    found.every((migration, index) => migration === expectedProductionMigrations[index])
  );
}

export function buildProductionApplyCommand(databaseUrl: string): readonly string[] {
  return ["supabase", "db", "push", "--db-url", databaseUrl] as const;
}

export function buildProductionMigrationListCommand(databaseUrl: string): readonly string[] {
  return ["supabase", "migration", "list", "--db-url", databaseUrl] as const;
}

export function hasAppliedProductionMigrations(output: string): boolean {
  const normalized = output.replace(/\u001b\[[0-9;]*m/g, "");
  return ["016"].every((version) => {
    const row = normalized
      .split("\n")
      .map((line) => line.split("|").map((cell) => cell.trim()))
      .find((cells) => cells[0] === version);
    return row?.[1] === version;
  });
}
