import { mkdir, rename, rm, writeFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const target = process.env.AUTORAG_CORPUS_PATH || "/data/corpus";
if (!url || !key) throw new Error("Supabase public configuration is required");

const temporary = `${target}.next`;
await rm(temporary, { recursive: true, force: true });
await mkdir(temporary, { recursive: true, mode: 0o700 });
let offset = 0;
let written = 0;
for (;;) {
  const endpoint = new URL("/rest/v1/khassida_chunks", url);
  endpoint.searchParams.set(
    "select",
    "id,arabic_text,transcription,french_translation,commentary,chapter_number,verse_start,verse_end,page_number,khassidas!inner(title,slug,is_verified)",
  );
  endpoint.searchParams.set("validation_status", "eq.verified");
  endpoint.searchParams.set("khassidas.is_verified", "eq.true");
  endpoint.searchParams.set("order", "id.asc");
  endpoint.searchParams.set("offset", String(offset));
  endpoint.searchParams.set("limit", "500");
  const response = await fetch(endpoint, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Supabase corpus sync failed: ${response.status}`);
  const rows = (await response.json()) as Chunk[];
  for (const row of rows) {
    await writeFile(`${temporary}/${row.id}.md`, renderChunk(row), { mode: 0o600 });
    written += 1;
  }
  if (rows.length < 500) break;
  offset += rows.length;
}
if (!written) throw new Error("No verified chunk was returned; refusing to replace the corpus");
const previous = `${target}.previous`;
await rm(previous, { recursive: true, force: true });
try {
  await rename(target, previous);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await rename(temporary, target);
await rm(previous, { recursive: true, force: true });
console.log(`AutoRAG corpus synchronized: ${written} verified chunks`);

function renderChunk(chunk: Chunk) {
  const work = Array.isArray(chunk.khassidas) ? chunk.khassidas[0] : chunk.khassidas;
  return [
    `# ${work?.title || "Khassida"}`,
    `Chunk-ID: ${chunk.id}`,
    `Slug: ${work?.slug || ""}`,
    chunk.chapter_number ? `Chapitre: ${chunk.chapter_number}` : "",
    chunk.verse_start
      ? `Vers: ${chunk.verse_start}${chunk.verse_end ? `-${chunk.verse_end}` : ""}`
      : "",
    chunk.page_number ? `Page: ${chunk.page_number}` : "",
    chunk.arabic_text ? `## Arabe\n${chunk.arabic_text}` : "",
    chunk.transcription ? `## Transcription\n${chunk.transcription}` : "",
    chunk.french_translation ? `## Traduction française\n${chunk.french_translation}` : "",
    chunk.commentary ? `## Commentaire éditorial\n${chunk.commentary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

type Chunk = {
  id: string;
  arabic_text?: string;
  transcription?: string;
  french_translation?: string;
  commentary?: string;
  chapter_number?: number;
  verse_start?: number;
  verse_end?: number;
  page_number?: number;
  khassidas?:
    | { title?: string; slug?: string; is_verified?: boolean }
    | Array<{ title?: string; slug?: string; is_verified?: boolean }>;
};
