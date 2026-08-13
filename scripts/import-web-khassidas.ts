import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { deleteMedia, minioBucket, putMedia } from "../lib/minio";
import { withObjectCompensation } from "../lib/storage-workflow";
import {
  assertAllowedImportUrl,
  assertPdf,
  importObjectKey,
  sha256,
  type ImportWork,
} from "../lib/catalog-import";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Variables Supabase serveur manquantes");

const apply = process.argv.includes("--apply");
const manifestArg = process.argv.find((value) => value.startsWith("--manifest="));
const manifestPath = manifestArg
  ? manifestArg.slice("--manifest=".length)
  : join(process.cwd(), "config", "khassida-import-sources.json");
const allowedHosts = new Set(
  (process.env.WEB_IMPORT_ALLOWED_HOSTS || "files.xassaid.com")
    .split(",")
    .map((host) => host.trim().toLocaleLowerCase("en"))
    .filter(Boolean),
);
const maxBytes = Number(process.env.WEB_IMPORT_MAX_BYTES || 50 * 1024 * 1024);
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ImportWork[];
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

console.log(`Mode: ${apply ? "IMPORT" : "DRY RUN"}`);
console.log(`Manifeste: ${manifestPath}`);
console.log(`Œuvres: ${manifest.length}`);

for (const candidate of manifest) {
  if (!candidate.slug || !candidate.title || !candidate.resources.length) {
    throw new Error(`Entrée incomplète dans le manifeste: ${candidate.slug || "sans slug"}`);
  }
  for (const resource of candidate.resources) {
    const sourceUrl = assertAllowedImportUrl(resource.url, allowedHosts);
    console.log(`${apply ? "Import" : "Prévu"}: ${candidate.slug} ← ${sourceUrl.hostname}`);
    if (!apply) continue;

    const { data: existingWork, error: workError } = await db
      .from("khassidas")
      .select("id")
      .eq("slug", candidate.slug)
      .maybeSingle();
    if (workError) throw workError;
    let work = existingWork;
    if (!work) {
      const result = await db
        .from("khassidas")
        .insert({
          slug: candidate.slug,
          title: candidate.title,
          aliases: candidate.aliases || [],
          themes: candidate.themes || [],
          description: candidate.description || "Ressource importée, à valider.",
          source_name: resource.sourceName,
          is_verified: false,
        })
        .select("id")
        .single();
      if (result.error) throw result.error;
      work = result.data;
    }

    const response = await fetch(sourceUrl, { redirect: "follow" });
    if (!response.ok) throw new Error(`${candidate.slug}: téléchargement HTTP ${response.status}`);
    assertAllowedImportUrl(response.url, allowedHosts);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) throw new Error(`${candidate.slug}: fichier trop volumineux`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error(`${candidate.slug}: fichier trop volumineux`);
    assertPdf(bytes, response.headers.get("content-type"));

    const digest = sha256(bytes);
    const fileName = decodeURIComponent(basename(sourceUrl.pathname)) || `${candidate.slug}.pdf`;
    const objectKey = importObjectKey(work.id, digest, fileName);
    const { data: existing, error: existingError } = await db
      .from("khassida_editions")
      .select("id")
      .eq("object_key", objectKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      console.log(`${candidate.slug}: ressource déjà importée`);
      continue;
    }

    await putMedia(objectKey, bytes, "application/pdf");
    await withObjectCompensation(
      objectKey,
      async () => {
        const { error: editionError } = await db.from("khassida_editions").insert({
          khassida_id: work.id,
          language: resource.language,
          edition_kind: resource.editionKind,
          title: resource.title || null,
          translator: resource.translator || null,
          publisher: resource.publisher || null,
          source_name: `${resource.sourceName} — ${sourceUrl.toString()}`,
          bucket: minioBucket,
          object_key: objectKey,
          mime_type: "application/pdf",
          file_name: fileName,
          file_size: bytes.length,
          validation_status: "review",
        });
        if (editionError) throw editionError;
      },
      deleteMedia,
    );
    console.log(`${candidate.slug}: importé dans MinIO, statut review`);
  }
}

console.log(apply ? "Import terminé — validation admin requise" : "DRY RUN terminé — rien importé");
