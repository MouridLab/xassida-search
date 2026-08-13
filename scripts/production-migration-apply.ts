import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import {
  buildProductionApplyCommand,
  buildProductionDryRunCommand,
  buildProductionMigrationListCommand,
  expectedProductionMigrations,
  extractMigrationFiles,
  hasAppliedProductionMigrations,
  isExpectedProductionDryRun,
} from "./production-migration-dry-run-policy";

function fail(message: string): never {
  console.error(`Safety check failed: ${message}`);
  process.exit(1);
}

function validateProductionTarget(): { databaseUrl: string; productionRef: string } {
  const databaseUrl = process.env.SUPABASE_PRODUCTION_DB_URL;
  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;
  if (!databaseUrl) fail("SUPABASE_PRODUCTION_DB_URL is missing from .env.local");
  if (!productionRef) fail("SUPABASE_PRODUCTION_PROJECT_REF is missing from .env.local");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    fail("SUPABASE_PRODUCTION_DB_URL is not a valid URL");
  }
  if (!parsedUrl.hostname.endsWith(".pooler.supabase.com") || parsedUrl.port !== "5432") {
    fail("production URL must use the Supabase Session pooler on port 5432");
  }
  if (!parsedUrl.username.endsWith(`.${productionRef}`)) {
    fail("production database username does not match the production Project Ref");
  }
  return { databaseUrl, productionRef };
}

function verifyLatestBackup(): string {
  const backupRoot =
    process.env.SUPABASE_BACKUP_ROOT ?? join(homedir(), ".local/share/xassida-search/backups");
  if (!existsSync(backupRoot) || lstatSync(backupRoot).isSymbolicLink()) {
    fail("secure backup root is missing or is a symbolic link");
  }
  const root = realpathSync(backupRoot);
  const candidates = readdirSync(root)
    .filter((name) => /^production-\d{8}T\d{6}Z$/.test(name))
    .sort()
    .reverse();
  if (!candidates[0]) fail("no production backup directory found");

  const backupDirectory = join(root, candidates[0]);
  if (lstatSync(backupDirectory).isSymbolicLink()) fail("latest backup is a symbolic link");
  const manifestPath = join(backupDirectory, "SHA256SUMS");
  if (!existsSync(manifestPath)) fail("latest backup has no SHA256SUMS");

  const requiredFiles = [
    "roles.sql",
    "schema.sql",
    "data.sql",
    "history_schema.sql",
    "history_data.sql",
  ];
  const checksums = new Map<string, string>();
  for (const line of readFileSync(manifestPath, "utf8").trim().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})\s+\*?([^/]+)$/i);
    if (match) checksums.set(match[2], match[1].toLowerCase());
  }
  for (const fileName of requiredFiles) {
    const filePath = join(backupDirectory, fileName);
    if (!existsSync(filePath) || lstatSync(filePath).isSymbolicLink()) {
      fail(`latest backup is missing ${fileName}`);
    }
    const actual = createHash("sha256").update(readFileSync(filePath)).digest("hex");
    if (checksums.get(fileName) !== actual) fail(`checksum mismatch for ${fileName}`);
  }
  return backupDirectory;
}

function run(command: readonly string[]): string {
  const [executable, ...args] = command;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const databaseUrl = process.env.SUPABASE_PRODUCTION_DB_URL ?? "";
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replaceAll(
    databaseUrl,
    "[REDACTED]",
  );
  if (output.trim()) console.log(output.trim());
  if (result.status !== 0) fail(`command failed: ${executable} ${args.slice(0, 2).join(" ")}`);
  return output;
}

const { databaseUrl, productionRef } = validateProductionTarget();
const backupDirectory = verifyLatestBackup();

console.log(`Target Supabase project: ${productionRef}`);
console.log("Environment: PRODUCTION");
console.log(`Verified backup directory: ${backupDirectory}`);
console.log("BACKUP VERIFIED: YES");
console.warn("WARNING: RESTORE VERIFIED: NO");
console.warn("WARNING: proceeding requires explicit acceptance of unverified restore risk");

console.log("Running mandatory pre-apply dry-run...");
const dryRunOutput = run(buildProductionDryRunCommand(databaseUrl));
if (!isExpectedProductionDryRun(dryRunOutput)) {
  const found = extractMigrationFiles(dryRunOutput);
  fail(`dry-run must contain exactly 012 and 013; found: ${found.join(", ") || "none"}`);
}

console.log("Migrations approved by dry-run:");
for (const migration of expectedProductionMigrations) console.log(`- ${migration}`);

const expectedConfirmation = "APPLY 012 013 TO PRODUCTION";
const readline = createInterface({ input: process.stdin, output: process.stdout });
const confirmation = await readline.question(`Type exactly "${expectedConfirmation}": `);
readline.close();
if (confirmation !== expectedConfirmation) fail("exact production confirmation not received");

run(buildProductionApplyCommand(databaseUrl));

console.log("Verifying remote migration history...");
const migrationList = run(buildProductionMigrationListCommand(databaseUrl));
if (!hasAppliedProductionMigrations(migrationList)) {
  fail("remote migration history does not confirm both 012 and 013");
}
console.log("PASS: migrations 012 and 013 are present in remote history.");
