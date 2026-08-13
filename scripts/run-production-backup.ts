import { spawn } from "node:child_process";

const databaseUrl = process.env.SUPABASE_PRODUCTION_DB_URL;
if (!databaseUrl) throw new Error("SUPABASE_PRODUCTION_DB_URL is missing from .env.local");

const child = spawn("bash", ["scripts/backup-production-db.sh"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`Unable to start backup script: ${error.message}`);
  process.exit(1);
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
