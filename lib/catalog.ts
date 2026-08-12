import { isConfigured, publicServerClient } from "@/lib/supabase";
import type { Khassida } from "@/types/database";
import type { WorkStats } from "@/components/khassidas/WorkCard";

export async function getCatalog() {
  if (!isConfigured) return { works: [] as Khassida[], stats: {} as Record<string, WorkStats> };
  const db = publicServerClient();
  const [{ data: works }, { data: chunks }, { data: media }] = await Promise.all([
    db.from("khassidas").select("*").eq("is_verified", true).order("title").limit(250),
    db
      .from("khassida_chunks")
      .select("khassida_id,verse_end,page_number")
      .eq("validation_status", "verified")
      .limit(5000),
    db.from("media_assets").select("khassida_id,kind"),
  ]);
  const map: Record<string, WorkStats> = {};
  for (const chunk of chunks || []) {
    const value = map[chunk.khassida_id] || {};
    value.verses = Math.max(value.verses || 0, chunk.verse_end || 0);
    value.pages = Math.max(value.pages || 0, chunk.page_number || 0);
    map[chunk.khassida_id] = value;
  }
  for (const item of media || []) {
    const current = map[item.khassida_id] || {};
    if (item.kind === "audio") current.hasAudio = true;
    if (item.kind === "pdf") current.hasPdf = true;
    map[item.khassida_id] = current;
  }
  return { works: (works || []) as Khassida[], stats: map };
}
