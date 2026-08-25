import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Compass,
  Feather,
  Flower2,
  HandHeart,
  HeartHandshake,
  History,
  Landmark,
  MoonStar,
  ScrollText,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { CatalogExplorer } from "@/components/khassidas/CatalogExplorer";
import { getCatalog } from "@/lib/catalog";
import { normalizeTheme, uniqueThemeOptions } from "@/lib/catalog-themes";

export const metadata = { title: "Thèmes" };

const themeStyles = [
  {
    words: ["prière", "invocation", "repentir"],
    icon: HandHeart,
  },
  { words: ["touba", "lieu", "ville", "mourid", "mouridiyya", "dahira"], icon: Landmark },
  { words: ["protection", "préservation", "salut"], icon: Shield },
  { words: ["prophète", "muhammad", "éloge prophétique"], icon: HeartHandshake },
  {
    words: ["éducation", "enseignement", "savoir", "discipline", "sagesse"],
    icon: BookOpenCheck,
  },
  {
    words: ["spiritualité", "dévotion", "soufisme", "méditation"],
    icon: Feather,
  },
  { words: ["islam", "tawhid", "dieu", "noms divins"], icon: MoonStar },
  { words: ["histoire", "exil", "colonial"], icon: History },
  { words: ["guidance", "cheminement", "réforme"], icon: Compass },
  { words: ["éthique", "humanité"], icon: HandHeart },
  { words: ["guérison"], icon: Flower2 },
  { words: ["grâce", "gratitude", "louange"], icon: Sparkles },
] as const;

function themeAppearance(theme: string) {
  const normalized = theme.toLocaleLowerCase("fr");
  return (
    themeStyles.find(({ words }) => words.some((word) => normalized.includes(word))) || {
      icon: ScrollText,
    }
  );
}

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const [{ works, stats }, params] = await Promise.all([getCatalog(), searchParams]);
  const selectedTheme = params.theme || "";
  const selectedThemeKey = normalizeTheme(selectedTheme);
  const themes = uniqueThemeOptions(works.flatMap((work) => work.themes));

  return (
    <main>
      <PageHero
        eyebrow="Chemins de lecture"
        title="Explorer par thème"
        description="Découvrez les khassaïdes à travers leurs grands thèmes spirituels, éducatifs et historiques."
      />
      <section className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {themes.map(([themeKey, themeLabel]) => {
            const active = themeKey === selectedThemeKey;
            const appearance = themeAppearance(themeLabel);
            const Icon = appearance.icon;
            return (
              <Link
                key={themeKey}
                href={active ? "/themes" : `/themes?theme=${encodeURIComponent(themeLabel)}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface hover:border-brand/20"
                }`}
              >
                <span
                  className={`relative grid size-12 shrink-0 place-items-center rounded-full border transition duration-300 after:absolute after:-bottom-1 after:size-1.5 after:rotate-45 after:border after:content-[''] group-hover:rotate-[-3deg] group-hover:scale-105 ${
                    active
                      ? "border-white/25 bg-white/10 text-white after:border-white/40 after:bg-brand"
                      : "border-gold/40 bg-gold/10 text-brand after:border-gold/50 after:bg-surface"
                  }`}
                >
                  <span className="absolute inset-1 rounded-full border border-current opacity-15" />
                  <Icon size={20} strokeWidth={1.55} />
                </span>
                <strong className="flex-1 text-sm">{themeLabel}</strong>
                {active ? (
                  <X size={15} />
                ) : (
                  <ArrowRight
                    size={15}
                    className="text-muted transition group-hover:translate-x-1"
                  />
                )}
              </Link>
            );
          })}
        </div>
        <CatalogExplorer
          key={selectedTheme || "all"}
          works={works}
          stats={stats}
          initialTheme={selectedTheme}
        />
      </section>
    </main>
  );
}
