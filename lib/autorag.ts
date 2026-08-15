import { z } from "zod";

const resultSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  source: z.string().optional(),
});

const responseSchema = z.object({
  answer: z.string(),
  results: z.array(resultSchema),
});

export type AutoRagResponse = z.infer<typeof responseSchema>;

export function chunkIdFromAutoRagSource(source?: string) {
  if (!source) return null;
  return (
    source.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0] ||
    null
  );
}

export async function askAutoRag(question: string, signal: AbortSignal): Promise<AutoRagResponse> {
  const endpoint = process.env.AUTORAG_SERVICE_URL;
  const token = process.env.AUTORAG_INTERNAL_TOKEN;
  if (!endpoint || !token) throw new Error("AUTORAG_NOT_CONFIGURED");
  const response = await fetch(new URL("/search", endpoint), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ question }),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(response.status === 504 ? "AUTORAG_TIMEOUT" : "AUTORAG_FAILED");
  return responseSchema.parse(await response.json());
}
