import { KourelExplorer } from "@/components/kourels/KourelExplorer";
import { PageHero } from "@/components/site/PageHero";
import { isConfigured, publicServerClient } from "@/lib/supabase";
import type { LibraryItem } from "@/types/library";

export const metadata = { title: "Prestations des kourels" };
export const revalidate = 300;

export default async function KourelsPage() {
  let items: LibraryItem[] = [];
  if (isConfigured) {
    const { data } = await publicServerClient()
      .from("library_items")
      .select("*")
      .eq("is_verified", true)
      .in("item_type", ["audio", "video"])
      .order("publication_year", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    items = ((data || []) as LibraryItem[]).filter((item) =>
      item.themes.some((theme) => theme.toLocaleLowerCase("fr").includes("kourel")),
    );
  }
  return (
    <main>
      <PageHero
        eyebrow="Patrimoine vivant"
        title="Prestations des kourels"
        description="Écoutez et regardez les prestations publiées des kourels, reliées à leur source et à leur contexte."
      />
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <KourelExplorer items={items} />
      </section>
    </main>
  );
}
