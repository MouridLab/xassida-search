import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { minioBucket, putMedia } from "../lib/minio";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase manquante");
const db = createClient(url, key, { auth: { persistSession: false } });
const covers = ["astahfirul-laha-bihi", "jazbul-qulub"] as const;

for (const slug of covers) {
  const { data: work, error: workError } = await db
    .from("khassidas")
    .select("id,title")
    .eq("slug", slug)
    .single();
  if (workError || !work) throw workError || new Error(`Khassaïde absent : ${slug}`);
  const fileName = `${slug}.png`;
  const path = join(process.cwd(), "public", "images", "covers", fileName);
  const bytes = await readFile(path);
  const info = await stat(path);
  const objectKey = `khassidas/${work.id}/cover/${fileName}`;
  await putMedia(objectKey, bytes, "image/png");
  await db
    .from("media_assets")
    .update({ is_primary: false })
    .eq("khassida_id", work.id)
    .eq("kind", "cover");
  const { data: existing } = await db
    .from("media_assets")
    .select("id")
    .eq("khassida_id", work.id)
    .eq("kind", "cover")
    .eq("object_key", objectKey)
    .maybeSingle();
  const values = {
    khassida_id: work.id,
    kind: "cover",
    provider: "minio",
    bucket: minioBucket,
    object_key: objectKey,
    mime_type: "image/png",
    file_name: fileName,
    file_size: info.size,
    is_primary: true,
  };
  const { error } = existing
    ? await db.from("media_assets").update(values).eq("id", existing.id)
    : await db.from("media_assets").insert(values);
  if (error) throw error;
  console.log(`${work.title}: couverture importée dans MinIO (${Math.round(info.size / 1024)} Ko)`);
}
