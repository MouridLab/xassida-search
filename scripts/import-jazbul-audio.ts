import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { minioBucket, putMedia } from "../lib/minio";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase manquante");

const db = createClient(url, key, { auth: { persistSession: false } });
const { data: work, error: workError } = await db
  .from("khassidas")
  .select("id,title")
  .eq("slug", "jazbul-qulub")
  .single();

if (workError || !work) throw workError || new Error("Jazbul Qulub est absent du corpus");

const path = join(process.cwd(), ".tmp", "jazbul-qulub-synced-mobile.m4v");
const bytes = await readFile(path);
const info = await stat(path);
const objectKey = `khassidas/${work.id}/audio/jazbul-qulub-kourel-serigne-mahib-gueye.mp4`;

await putMedia(objectKey, bytes, "video/mp4");
await db
  .from("media_assets")
  .update({ is_primary: false })
  .eq("khassida_id", work.id)
  .eq("kind", "audio");
await db
  .from("media_assets")
  .delete()
  .eq("khassida_id", work.id)
  .eq("kind", "audio")
  .eq("object_key", objectKey);

const { error } = await db.from("media_assets").insert({
  khassida_id: work.id,
  kind: "audio",
  provider: "minio",
  bucket: minioBucket,
  object_key: objectKey,
  mime_type: "video/mp4",
  file_name: "jazbul-qulub-kourel-serigne-mahib-gueye.mp4",
  file_size: info.size,
  source_url: "Vidéo fournie localement — Ramadan 1446H/2025",
  is_primary: true,
});

if (error) throw error;
console.log(`${work.title}: audio principal importé (${Math.round(info.size / 1024 / 1024)} Mo)`);
