import { z } from "zod";
import { ConcurrencyGate } from "./api-abuse";
import { MemoryRateLimiter, PostgresRateLimiter } from "./shared-rate-limit";

export const askInput = z.object({ question: z.string().trim().min(5).max(500) }).strict();
export const ASK_MAX_BODY_BYTES = 2_048;
export const ASK_TIMEOUT_MS = 120_000;

const rateLimit = Number(process.env.ASK_RATE_LIMIT || 10);
const rateWindowMs = Number(process.env.ASK_RATE_WINDOW_MS || 300_000);
const concurrency = Number(process.env.ASK_MAX_CONCURRENCY || 4);

const safeLimit = Number.isInteger(rateLimit) && rateLimit > 0 ? rateLimit : 10;
const safeWindow = Number.isInteger(rateWindowMs) && rateWindowMs > 0 ? rateWindowMs : 300_000;
export const askRateLimiter =
  process.env.ASK_RATE_LIMIT_BACKEND === "memory"
    ? new MemoryRateLimiter(safeLimit, safeWindow)
    : new PostgresRateLimiter(safeLimit, Math.ceil(safeWindow / 1000));
export const askConcurrencyGate = new ConcurrencyGate(
  Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 4,
);
