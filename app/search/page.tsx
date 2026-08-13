import { SearchExperience } from "@/components/search/SearchExperience";
import { PageHero } from "@/components/site/PageHero";

export const metadata = { title: "Recherche" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  return (
    <main>
      <PageHero
        eyebrow="Recherche unifiée"
        title="Explorer tout le corpus"
        description="Retrouvez les œuvres, passages et ressources documentaires en arabe, transcription ou français."
      />
      <SearchExperience
        initialQuery={params.q || ""}
        initialType={params.type || "all"}
        initialPage={Number(params.page) || 1}
      />
    </main>
  );
}
