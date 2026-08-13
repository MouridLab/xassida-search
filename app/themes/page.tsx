import Link from "next/link";
import {
  ArrowRight,
  BookHeart,
  GraduationCap,
  Heart,
  History,
  Landmark,
  MapPin,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Sun,
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
    icon: MoonStar,
    tone: "bg-indigo-50 text-indigo-700",
  },
  { words: ["touba", "lieu", "ville"], icon: MapPin, tone: "bg-emerald-50 text-emerald-700" },
  { words: ["protection", "préservation"], icon: ShieldCheck, tone: "bg-sky-50 text-sky-700" },
  { words: ["prophète", "muhammad", "louange"], icon: Heart, tone: "bg-rose-50 text-rose-700" },
  {
    words: ["éducation", "enseignement", "savoir"],
    icon: GraduationCap,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    words: ["spiritualité", "dévotion", "soufisme"],
    icon: Sparkles,
    tone: "bg-violet-50 text-violet-700",
  },
  { words: ["islam", "tawhid", "dieu"], icon: Sun, tone: "bg-orange-50 text-orange-700" },
  { words: ["histoire", "exil", "colonial"], icon: History, tone: "bg-stone-100 text-stone-700" },
  { words: ["mourid", "mouridiyya", "dahira"], icon: Landmark, tone: "bg-teal-50 text-teal-700" },
] as const;

function themeAppearance(theme: string) {
  const normalized = theme.toLocaleLowerCase("fr");
  return (
    themeStyles.find(({ words }) => words.some((word) => normalized.includes(word))) || {
      icon: BookHeart,
      tone: "bg-blue-50 text-blue-700",
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
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl transition group-hover:scale-105 ${active ? "bg-white/15 text-white" : appearance.tone}`}
                >
                  <Icon size={20} strokeWidth={1.8} />
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
