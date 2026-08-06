import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { minioBucket, putMedia } from "../lib/minio";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase manquante");
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: work, error: workError } = await db
  .from("khassidas")
  .select("id,title")
  .eq("slug", "astahfirul-laha-bihi")
  .single();
if (workError || !work)
  throw workError || new Error("Astahfirul Laha Bihi est absent du corpus");

const root = join(process.cwd(), ".tmp", "astahfir");
const files = [
  {
    kind: "pdf",
    path: join(root, "astahfirul-laha-bihi.pdf"),
    name: "astahfirul-laha-bihi.pdf",
    mime: "application/pdf",
    source: "https://khassidaenpdf.net/BOOKS/Astahfirul_laha_bihi_1.pdf",
  },
  {
    kind: "audio",
    path: join(root, "astahfiroulahabihi.m4a"),
    name: "astahfiroulahabihi.m4a",
    mime: "audio/mp4",
    source: "https://www.youtube.com/watch?v=QCFRsqiqaZU",
  },
] as const;

for (const file of files) {
  const bytes = await readFile(file.path);
  const info = await stat(file.path);
  const objectKey = `khassidas/${work.id}/${file.kind}/${file.name}`;
  await putMedia(objectKey, bytes, file.mime);
  await db
    .from("media_assets")
    .update({ is_primary: false })
    .eq("khassida_id", work.id)
    .eq("kind", file.kind);
  await db
    .from("media_assets")
    .delete()
    .eq("khassida_id", work.id)
    .eq("kind", file.kind)
    .eq("object_key", objectKey);
  const { error } = await db
    .from("media_assets")
    .insert({
      khassida_id: work.id,
      kind: file.kind,
      provider: "minio",
      bucket: minioBucket,
      object_key: objectKey,
      mime_type: file.mime,
      file_name: file.name,
      file_size: info.size,
      source_url: file.source,
      is_primary: true,
    });
  if (error) throw error;
  console.log(
    `${work.title}: ${file.kind} importé dans MinIO (${Math.round(info.size / 1024)} Ko)`,
  );
}
