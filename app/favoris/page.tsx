import { FavoritesExperience } from "@/components/favorites/FavoritesExperience";
import { PageHero } from "@/components/site/PageHero";

export const metadata = { title: "Mes favoris" };

export default function FavoritesPage() {
  return (
    <main>
      <PageHero
        eyebrow="Bibliothèque personnelle"
        title="Mes favoris"
        description="Retrouvez les khassaïdes que vous avez conservés sur cet appareil."
      />
      <section className="mx-auto max-w-[1100px] px-5 py-12 lg:px-8">
        <FavoritesExperience />
      </section>
    </main>
  );
}
