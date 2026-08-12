import { LibraryExplorer } from "@/components/library/LibraryExplorer";
import { PageHero } from "@/components/site/PageHero";
import { isConfigured, publicServerClient } from "@/lib/supabase";
import type { LibraryItem } from "@/types/library";
export const metadata = { title: "Bibliothèque" };
export default async function LibraryPage() {
  let items: LibraryItem[] = [];
  if (isConfigured) {
    const { data } = await publicServerClient()
      .from("library_items")
      .select("*")
      .eq("is_verified", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    items = (data || []) as LibraryItem[];
  }
  return (
    <main>
      <PageHero
        eyebrow="Centre documentaire"
        title="Bibliothèque mouride"
        description="Explorez des livres, biographies, articles, conférences, manuscrits, archives et ressources audiovisuelles autour du mouridisme."
      />
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <LibraryExplorer items={items} />
      </section>
    </main>
  );
}
