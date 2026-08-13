import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { headMedia } from "../lib/minio";
import { worksMissingReadableMedia } from "../lib/catalog-import";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Variables Supabase serveur manquantes");

const apply = process.argv.includes("--apply");
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const { data: works, error: worksError } = await db
  .from("khassidas")
  .select("id,slug,title,is_verified")
  .eq("is_verified", true)
  .order("title");
if (worksError) throw worksError;

const [{ data: media, error: mediaError }, { data: editions, error: editionsError }] =
  await Promise.all([
    db
      .from("media_assets")
      .select("khassida_id,object_key,kind")
      .eq("provider", "minio")
      .eq("is_primary", true)
      .in("kind", ["pdf", "audio"]),
    db
      .from("khassida_editions")
      .select("khassida_id,object_key")
      .eq("validation_status", "verified"),
  ]);
if (mediaError) throw mediaError;
if (editionsError) throw editionsError;

const readable = new Set<string>();
for (const item of [...(media || []), ...(editions || [])]) {
  try {
    await headMedia(item.object_key);
    readable.add(item.khassida_id);
  } catch {
    // Un objet référencé mais absent ne prouve pas que l’œuvre est lisible.
  }
}

const missingIds = worksMissingReadableMedia(
  (works || []).map((work) => work.id),
  readable,
);
const missing = (works || []).filter((work) => missingIds.includes(work.id));

console.log(`Œuvres publiques contrôlées: ${works?.length || 0}`);
console.log(`Œuvres avec média MinIO lisible: ${readable.size}`);
console.log(`Œuvres à dépublier: ${missing.length}`);
missing.forEach((work) => console.log(`- ${work.slug} — ${work.title}`));

if (!apply) {
  console.log("DRY RUN — aucune œuvre modifiée");
  process.exit(0);
}
if (!missing.length) {
  console.log("Aucune modification nécessaire");
  process.exit(0);
}

const confirmation = "UNPUBLISH WORKS WITHOUT MINIO";
const prompt = createInterface({ input: process.stdin, output: process.stdout });
const answer = await prompt.question(`Tapez exactement « ${confirmation} »: `);
prompt.close();
if (answer !== confirmation) throw new Error("Confirmation explicite non reçue");

const { error: updateError } = await db
  .from("khassidas")
  .update({ is_verified: false })
  .in("id", missingIds);
if (updateError) throw updateError;
console.log(`${missing.length} œuvre(s) dépubliée(s), aucune donnée supprimée`);
