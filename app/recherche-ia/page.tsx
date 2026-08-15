import { AskInterface } from "@/components/ai/AskInterface";
import { getCatalog } from "@/lib/catalog";

export const metadata = { title: "Questionner le corpus" };

export default async function AskPage() {
  const { works, stats } = await getCatalog();
  const corpus = works.map((work) => ({
    id: work.id,
    title: work.title,
    slug: work.slug,
    pageCount: stats[work.id]?.pages || work.page_count,
    hasAudio: Boolean(stats[work.id]?.hasAudio || work.audio_url),
    kind: "khassida" as const,
  }));

  return <AskInterface works={corpus} />;
}
