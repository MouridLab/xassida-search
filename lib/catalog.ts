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
    db.from("media_assets").select("id,khassida_id,kind,provider,external_url").eq("is_primary",true),
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
  const enriched=(works||[]).map(work=>{const cover=media?.find(item=>item.khassida_id===work.id&&item.kind==="cover");return {...work,cover_url:cover?(cover.provider==="external"?cover.external_url:`/api/media/${cover.id}`):null}}) as Khassida[];
  for(const work of enriched){const current=map[work.id]||{};current.pages=Math.max(current.pages||0,work.page_count||0);current.verses=Math.max(current.verses||0,work.verse_count||0);map[work.id]=current}
  return { works: enriched, stats: map };
}
