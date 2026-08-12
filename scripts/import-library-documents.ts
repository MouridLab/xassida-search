import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { minioBucket, putMedia } from "../lib/minio";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase manquante");

const sourceDirectory = process.argv[2];
if (!sourceDirectory) {
  throw new Error("Usage : bun run import:library-documents -- /chemin/vers/les-pdf");
}

const documents = [
  "mourides-ahmadou-bamba-reception-islam-afrique",
  "dahira-urbain-pouvoir-mouridisme",
  "mouridisme-economie-traite-surplus-accumulation",
  "histoire-hizbut-tarqiyyah",
] as const;
const db = createClient(url, key, { auth: { persistSession: false } });

for (const slug of documents) {
  const fileName = `${slug}.pdf`;
  const path = join(sourceDirectory, fileName);
  const bytes = await readFile(path);
  const info = await stat(path);
  const objectKey = `library/${slug}/${fileName}`;
  await putMedia(objectKey, bytes, "application/pdf");
  const { error } = await db
    .from("library_items")
    .update({
      resource_url: null,
      media_bucket: minioBucket,
      media_object_key: objectKey,
      media_mime_type: "application/pdf",
      media_file_name: fileName,
      media_file_size: info.size,
    })
    .eq("slug", slug);
  if (error) throw error;
  console.log(`${slug}: importé dans MinIO (${Math.round(info.size / 1024)} Ko)`);
}
