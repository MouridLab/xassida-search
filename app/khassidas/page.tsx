import { PageHero } from "@/components/site/PageHero";
import { CatalogExplorer } from "@/components/khassidas/CatalogExplorer";
import { getCatalog } from "@/lib/catalog";
export const metadata = { title: "Khassaïdes" };
export default async function KhassidasPage() {
  const { works, stats } = await getCatalog();
  return (
    <main>
      <PageHero
        eyebrow="Œuvres poétiques"
        title="Les khassaïdes"
        description="Parcourez exclusivement les œuvres poétiques de Cheikh Ahmadou Bamba, organisées par titre et par thème."
      />
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <CatalogExplorer works={works} stats={stats} />
      </section>
    </main>
  );
}
