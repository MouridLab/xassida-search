"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  Compass,
  GraduationCap,
  Headphones,
  Heart,
  Home,
  Info,
  Library,
  MapPin,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  SunMedium,
} from "lucide-react";
import type { Khassida } from "@/types/database";
import { WorkCard, type WorkStats } from "@/components/khassidas/WorkCard";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
type Result = { kind: "khassida" | "chunk"; khassida: Khassida; stats?: WorkStats };
const themes = [
  ["Tawhid", SunMedium],
  ["Le Prophète ﷺ", Star],
  ["Touba", MapPin],
  ["Éducation", GraduationCap],
  ["Patience", Clock3],
  ["Spiritualité", Sparkles],
  ["Exil", Compass],
  ["Dévotion", Heart],
] as const;
const trust = [
  [ShieldCheck, "Contenu vérifié", "Chaque texte publié est rattaché à une source identifiée."],
  [
    BookOpen,
    "Sources authentiques",
    "Des éditions et documents consultables, sans attribution inventée.",
  ],
  [Headphones, "Audio de qualité", "Des récitations clairement attribuées et faciles à écouter."],
  [CheckCircle2, "Transmission fidèle", "Une lecture respectueuse de l’œuvre et de son contexte."],
] as const;

export function HomeExperience() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setResults(body.results);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recherche impossible");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/search?q=");
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (!cancelled) setResults(body.results);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Recherche impossible");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  const works = useMemo(() => {
    const unique = new Map<string, Result>();
    results.forEach((r) => unique.set(r.khassida.id, r));
    return [...unique.values()].slice(0, 8);
  }, [results]);
  return (
    <>
      <MobileHome
        works={works}
        query={query}
        setQuery={setQuery}
        search={search}
        loading={loading}
        error={error}
      />
      <main className="hidden">
        <section className="relative overflow-hidden border-b border-line bg-surface">
          <div className="soft-grid absolute inset-0 [mask-image:linear-gradient(to_right,black,transparent_58%)]" />
          <div className="absolute -right-32 -top-32 size-[550px] rounded-full bg-brand/10 blur-3xl" />
          <div className="relative mx-auto grid min-h-[620px] max-w-[1400px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand">
                <Sparkles size={14} /> Lire, comprendre et transmettre
              </span>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-.04em] text-ink sm:text-5xl lg:text-6xl">
                Recherchez, lisez et écoutez les khassaïdes de{" "}
                <span className="text-brand">Cheikh Ahmadou Bamba.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
                Une expérience de lecture calme et moderne, avec les textes, les sources et les
                récitations réunis au même endroit.
              </p>
              <form
                onSubmit={search}
                className="mt-8 flex max-w-2xl items-center rounded-2xl border border-line bg-surface p-1.5 shadow-card focus-within:border-brand/40 focus-within:ring-4 focus-within:ring-brand/5"
              >
                <Search className="ml-3 shrink-0 text-muted" size={20} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-muted/70"
                  placeholder="Rechercher un khassida, un vers, un thème…"
                />
                <button
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:bg-blue-700"
                  aria-label="Rechercher"
                >
                  {loading ? <span className="animate-pulse">…</span> : <ArrowRight size={19} />}
                </button>
              </form>
              <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [BookOpen, "Lire", "/khassidas"],
                  [Headphones, "Écouter", "/bibliotheque?type=audio"],
                  [Bot, "Recherche IA", "/recherche-ia"],
                  [Library, "Bibliothèque", "/bibliotheque"],
                ].map(([Icon, label, href]) => (
                  <Link
                    key={String(label)}
                    href={String(href)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface/80 px-3 py-3 text-xs font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brand/20 hover:text-brand"
                  >
                    <Icon size={16} />
                    {String(label)}
                  </Link>
                ))}
              </div>
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="relative hidden min-h-[480px] items-center justify-center lg:flex"
            >
              <div className="absolute size-[420px] rounded-full bg-gradient-to-br from-brand/15 to-gold/10 blur-2xl" />
              <Image
                priority
                src="/images/open-manuscript.png"
                width={720}
                height={520}
                className="relative h-auto w-full max-w-[650px] drop-shadow-[0_30px_35px_rgba(15,23,42,.16)]"
                alt="Manuscrit de khassida ouvert sur un support"
              />
            </motion.div>
          </div>
        </section>
        <section className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-brand">
                Bibliothèque
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Khassaïdes populaires
              </h2>
            </div>
            <Link
              href="/khassidas"
              className="flex items-center gap-1 text-sm font-semibold text-brand"
            >
              Voir tout <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {works.slice(0, 8).map(({ khassida, stats }) => (
              <WorkCard key={khassida.id} work={khassida} stats={stats} />
            ))}
          </div>
        </section>
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[.16em] text-brand">
                  Découvrir
                </span>
                <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Explorer par thème</h2>
              </div>
              <Link href="/themes" className="text-sm font-semibold text-brand">
                Tous les thèmes →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {themes.map(([name, Icon], i) => (
                <Link
                  href={`/themes?theme=${encodeURIComponent(name)}`}
                  key={name}
                  className="group rounded-2xl border border-line bg-canvas p-4 text-center transition hover:-translate-y-1 hover:border-brand/20 hover:bg-brand/5"
                >
                  <span
                    className={`mx-auto grid size-11 place-items-center rounded-xl ${i % 3 === 0 ? "bg-brand/10 text-brand" : i % 3 === 1 ? "bg-gold/15 text-amber-700" : "bg-success/10 text-success"}`}
                  >
                    <Icon size={20} />
                  </span>
                  <strong className="mt-3 block text-xs text-ink">{name}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-[1400px] gap-5 px-5 py-20 lg:grid-cols-3 lg:px-8">
          <Card className="lg:col-span-2 p-7">
            <span className="text-xs font-semibold uppercase tracking-[.16em] text-brand">
              Derniers ajouts
            </span>
            <div className="mt-5 divide-y divide-line">
              {works.slice(-3).map(({ khassida }) => (
                <Link
                  key={khassida.id}
                  href={`/khassidas/${khassida.slug}`}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/5 font-arabic text-xl text-brand">
                    خ
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-ink">{khassida.title}</strong>
                    <small className="font-arabic text-base text-muted">
                      {khassida.arabic_title}
                    </small>
                  </span>
                  <ArrowRight size={16} className="text-muted" />
                </Link>
              ))}
            </div>
          </Card>
          <Card className="relative overflow-hidden border-gold/20 bg-gradient-to-br from-surface to-gold/10 p-7">
            <span className="text-xs font-semibold uppercase tracking-[.16em] text-amber-700 dark:text-gold">
              Citation du jour
            </span>
            <blockquote className="mt-5 text-lg font-medium leading-8 text-ink">
              « Serigne Touba nous a laissé un trésor inestimable. Préservons-le, étudions-le et
              partageons-le. »
            </blockquote>
            <p className="mt-5 text-xs text-muted">— Khadimou Rassoul</p>
          </Card>
        </section>
        <section className="bg-brand/[.035]">
          <div className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-brand">
                Nos engagements
              </span>
              <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                Pourquoi Xassida Search ?
              </h2>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trust.map(([Icon, title, text]) => (
                <Card key={title} className="p-6">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-5 font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function MobileHome({
  works,
  query,
  setQuery,
  search,
  loading,
  error,
}: {
  works: Result[];
  query: string;
  setQuery: (value: string) => void;
  search: (event?: FormEvent) => Promise<void>;
  loading: boolean;
  error: string;
}) {
  const featured = works[0]?.khassida;
  const featuredHasCover = featured
    ? ["astahfirul-laha-bihi", "jazbul-qulub"].includes(featured.slug)
    : false;
  return (
    <main className="min-h-screen bg-white pb-28 text-ink">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 pb-4 pt-6 lg:px-8">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-700">
            Bibliothèque mouride
          </span>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Explorer les khassaïdes</h1>
        </div>
        <Link
          href="/recherche-ia"
          className="grid size-11 place-items-center rounded-full border border-slate-200 bg-slate-50 text-emerald-800 shadow-sm"
        >
          <Bot size={20} />
        </Link>
      </header>
      <form
        onSubmit={search}
        className="mx-auto flex h-12 w-[calc(100%-40px)] max-w-[1336px] items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm lg:h-14"
      >
        <Search size={18} className="text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder="Titre, thème ou vers…"
        />
        <button aria-label="Rechercher" className="text-emerald-700">
          {loading ? "…" : <ArrowRight size={18} />}
        </button>
      </form>
      {error && (
        <p className="mx-auto mt-3 w-[calc(100%-40px)] max-w-[1336px] text-xs text-red-600">
          {error}
        </p>
      )}
      {featured ? (
        <section className="mx-auto max-w-[1400px] px-5 pt-6 lg:px-8">
          <Link
            href={`/khassidas/${featured.slug}?tab=information`}
            className="relative block min-h-[460px] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-emerald-900 to-black shadow-2xl sm:min-h-[560px]"
          >
            <Image
              priority
              src={
                featuredHasCover
                  ? `/images/covers/${featured.slug}.png`
                  : "/images/open-manuscript.png"
              }
              alt={featuredHasCover ? `Couverture de ${featured.title}` : "Manuscrit de khassida"}
              fill
              className={
                featuredHasCover ? "bg-white object-contain object-top" : "object-cover opacity-55"
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl p-6 text-center text-white sm:p-10">
              <p
                dir="rtl"
                className="font-arabic text-4xl leading-relaxed text-amber-200 sm:text-6xl"
              >
                {featured.arabic_title || "خَصَائِد"}
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-4xl">{featured.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/65 sm:text-base">
                {featured.description ||
                  "Lire, comprendre et écouter cette œuvre de Cheikh Ahmadou Bamba."}
              </p>
              <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-3">
                <span className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-bold text-black">
                  <Play size={19} fill="currentColor" />
                  Découvrir
                </span>
                <span className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/15 font-semibold backdrop-blur">
                  <Info size={18} />
                  Informations clés
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <div className="mx-auto mt-6 grid min-h-[360px] max-w-[1360px] place-items-center rounded-[28px] border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
          Aucun khassida disponible
        </div>
      )}
      <MobileShelf title="À découvrir" works={works.slice(1, 5)} />
      <MobileShelf title="Récemment ajoutés" works={[...works].reverse().slice(0, 4)} />
      <nav className="fixed inset-x-4 bottom-4 z-40 mx-auto grid max-w-xl grid-cols-4 rounded-[24px] border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
        <MobileNav href="/" icon={Home} label="Accueil" active />
        <MobileNav href="/khassidas" icon={BookOpen} label="Lire" />
        <MobileNav href="/bibliotheque?type=audio" icon={Headphones} label="Écouter" />
        <MobileNav href="/recherche-ia" icon={Search} label="Chercher" />
      </nav>
    </main>
  );
}
function MobileShelf({ title, works }: { title: string; works: Result[] }) {
  if (!works.length) return null;
  return (
    <section className="mx-auto max-w-[1400px] pt-8">
      <div className="flex items-center justify-between px-5 lg:px-8">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <Link href="/khassidas" className="text-xs font-semibold text-emerald-700">
          Voir tout
        </Link>
      </div>
      <div className="mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-2 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-8">
        {works.map(({ khassida }) => {
          const hasCover = ["astahfirul-laha-bihi", "jazbul-qulub"].includes(khassida.slug);
          return (
            <Link
              key={khassida.id}
              href={`/khassidas/${khassida.slug}?tab=information`}
              className="w-36 shrink-0 snap-start lg:w-auto"
            >
              <div
                className={cn(
                  "relative grid aspect-[3/4] place-items-center overflow-hidden rounded-2xl border p-4 text-center shadow-lg",
                  hasCover
                    ? "border-slate-200 bg-white"
                    : "border-emerald-950/10 bg-gradient-to-br from-emerald-950 to-emerald-700",
                )}
              >
                {hasCover ? (
                  <Image
                    src={`/images/covers/${khassida.slug}.png`}
                    alt={`Couverture de ${khassida.title}`}
                    fill
                    sizes="(min-width:1024px) 25vw, 144px"
                    className="object-contain p-2"
                  />
                ) : (
                  <>
                    <span className="absolute inset-2 rounded-xl border border-amber-300/25" />
                    <span
                      dir="rtl"
                      className="font-arabic text-2xl leading-relaxed text-amber-200 sm:text-3xl"
                    >
                      {khassida.arabic_title || "خَصَائِد"}
                    </span>
                  </>
                )}
                <span className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-white text-black shadow">
                  <Play size={13} fill="currentColor" />
                </span>
              </div>
              <strong className="mt-2 block truncate text-sm text-slate-900">
                {khassida.title}
              </strong>
              <span className="text-[11px] text-slate-500">
                {khassida.themes?.[0] || "Khassida"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
function MobileNav({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] ${active ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-400"}`}
    >
      <Icon size={19} />
      <span>{label}</span>
    </Link>
  );
}
