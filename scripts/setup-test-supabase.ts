import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";

const expectedMigrations = Array.from({ length: 16 }, (_, index) =>
  `${index + 1}`.padStart(3, "0"),
);
const projectRefPattern = /^[a-z0-9]{15,32}$/;

function fail(message: string): never {
  console.error(`Safety check failed: ${message}`);
  process.exit(1);
}

function run(args: string[], options: { capture?: boolean } = {}): string {
  const result = spawnSync("supabase", args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: options.capture ? ["inherit", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
  });

  const stdout = options.capture ? (result.stdout ?? "") : "";
  if (result.status !== 0) {
    if (options.capture) {
      const stderr = (result.stderr ?? "").trim();
      if (stderr) console.error(stderr);
    }
    fail(`Supabase CLI command failed: supabase ${args[0]}`);
  }
  return stdout;
}

function verifyLocalMigrations(): void {
  const migrationDirectory = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const versions = files.map((file) => file.split("_", 1)[0]);

  if (
    files.length !== expectedMigrations.length ||
    versions.some((version, index) => version !== expectedMigrations[index])
  ) {
    fail(
      `expected exactly migrations 001 through 016; found: ${files.map((file) => basename(file)).join(", ")}`,
    );
  }
}

function readProjectMetadata(projectRef: string): { name: string; ref: string } {
  const raw = run(["projects", "list", "--output", "json"], {
    capture: true,
  });
  let projects: Array<Record<string, unknown>>;
  try {
    projects = JSON.parse(raw);
  } catch {
    fail("could not parse authenticated Supabase project metadata");
  }

  const project = projects.find((candidate) => {
    const ref = candidate.id ?? candidate.ref ?? candidate.project_ref;
    return ref === projectRef;
  });
  if (!project) fail("target project is not visible to the authenticated CLI account");

  const name = String(project.name ?? "");
  const ref = String(project.id ?? project.ref ?? project.project_ref ?? "");
  if (!/(test|testing|staging|rls)/i.test(name)) {
    fail(`authenticated project name is not test-like: ${name || "<missing>"}`);
  }
  return { name, ref };
}

function verifyRemoteMigrationList(output: string): void {
  const ansi = /\u001b\[[0-9;]*m/g;
  const remoteVersions = output
    .replace(ansi, "")
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2 && /^\d{3}$/.test(cells[1]))
    .map((cells) => cells[1]);

  if (
    remoteVersions.length !== expectedMigrations.length ||
    remoteVersions.some((version, index) => version !== expectedMigrations[index])
  ) {
    fail(
      `remote migration history is not exactly 001 through 016 (found: ${remoteVersions.join(", ") || "none"})`,
    );
  }
}

async function main(): Promise<void> {
  verifyLocalMigrations();

  if (process.argv.includes("--check-only")) {
    console.log("Local safety check passed: migrations 001 through 016 are present.");
    return;
  }

  const projectRef = process.argv[2];
  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;

  if (!projectRef || !projectRefPattern.test(projectRef)) {
    fail("pass the TEST project ref as the first argument");
  }
  if (!productionRef || !projectRefPattern.test(productionRef)) {
    fail("SUPABASE_PRODUCTION_PROJECT_REF must be set to the production ref");
  }
  if (projectRef === productionRef) {
    fail("the TEST project ref matches SUPABASE_PRODUCTION_PROJECT_REF");
  }

  console.log(`Target Supabase project:\n${projectRef}\n\nEnvironment:\nTEST`);

  const metadata = readProjectMetadata(projectRef);
  console.log(`Authenticated project name: ${metadata.name}`);
  console.log(`Authenticated project ref: ${metadata.ref}`);

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const expectedConfirmation = `INITIALIZE TEST ${projectRef}`;
  const confirmation = await readline.question(
    `Type exactly "${expectedConfirmation}" to link, dry-run, and apply migrations 001-016: `,
  );
  if (confirmation !== expectedConfirmation) fail("explicit confirmation not received");

  run(["link", "--project-ref", projectRef]);

  console.log("Remote migration history before push:");
  run(["migration", "list", "--linked"]);

  console.log("Dry run (no seed data):");
  run(["db", "push", "--linked", "--include-all", "--dry-run"]);

  const pushConfirmation = await readline.question(
    `Type exactly "APPLY 001-016 TO TEST ${projectRef}" to execute db push: `,
  );
  if (pushConfirmation !== `APPLY 001-016 TO TEST ${projectRef}`) {
    fail("migration confirmation not received");
  }
  readline.close();

  run(["db", "push", "--linked", "--include-all"]);

  console.log("Verifying remote migration history:");
  const migrationList = run(["migration", "list", "--linked"], {
    capture: true,
  });
  console.log(migrationList.trim());
  verifyRemoteMigrationList(migrationList);
  console.log("PASS: remote migration history is exactly 001 through 016.");
}

await main();
