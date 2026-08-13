import { spawn } from "node:child_process";
import { buildProductionDryRunCommand } from "./production-migration-dry-run-policy";

function fail(message: string): never {
  console.error(`Safety check failed: ${message}`);
  process.exit(1);
}

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

console.log(`Target Supabase project: ${productionRef}`);
console.log("Environment: PRODUCTION");
console.warn("WARNING: BACKUP VERIFIED: YES — RESTORE VERIFIED: NO");
console.warn("WARNING: dry-run authorized; real db push remains forbidden");
console.log("Mode: DRY RUN — NO MIGRATIONS WILL BE APPLIED");

const [executable, ...args] = buildProductionDryRunCommand(databaseUrl);
const child = spawn(executable, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`Unable to start Supabase CLI: ${error.message}`);
  process.exit(1);
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
