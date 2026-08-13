"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Bot, Headphones, Home, Info, Play, Search } from "lucide-react";
import type { Khassida } from "@/types/database";
import type { WorkStats } from "@/components/khassidas/WorkCard";
import {
  hasUsefulReadingProgress,
  readLatestReadingProgress,
  type ReadingProgress,
} from "@/lib/reading-progress";
type Result = { kind: "khassida" | "chunk"; khassida: Khassida; stats?: WorkStats };

export function HomeExperience() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  async function search(event?: FormEvent) {
    event?.preventDefault();
    const value = query.trim();
    if (value.length >= 2) router.push(`/search?q=${encodeURIComponent(value)}`);
  }
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/search?scope=featured");
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
  useEffect(() => {
    const saved = readLatestReadingProgress(window.localStorage);
    setReadingProgress(hasUsefulReadingProgress(saved) ? saved : null);
  }, []);
  const works = useMemo(() => {
    const unique = new Map<string, Result>();
    results.forEach((r) => unique.set(r.khassida.id, r));
    return [...unique.values()].slice(0, 8);
  }, [results]);
  return (
    <HomeView
      works={works}
      query={query}
      setQuery={setQuery}
      search={search}
      loading={loading}
      error={error}
      readingProgress={readingProgress}
    />
  );
}

function HomeView({
  works,
  query,
  setQuery,
  search,
  loading,
  error,
  readingProgress,
}: {
  works: Result[];
  query: string;
  setQuery: (value: string) => void;
  search: (event?: FormEvent) => Promise<void>;
  loading: boolean;
  error: string;
  readingProgress: ReadingProgress | null;
}) {
  const featured = works[0]?.khassida;
  const featuredCover = featured?.cover_url;
  return (
    <main className="min-h-screen bg-canvas pb-28 text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,.65fr)] md:items-end md:py-20 lg:px-8 lg:py-28">
          <div className="relative border-l border-gold pl-5 sm:pl-9">
            <span className="folio-label">Ouverture · 001</span>
            <h1 className="mt-7 max-w-4xl text-[clamp(2.7rem,7vw,6.8rem)] font-semibold leading-[.91] tracking-[-.065em]">
              Lire les
              <br />
              <span className="text-brand">khassaïdes.</span>
              <br />
              Transmettre les sources.
            </h1>
          </div>
          <div className="pb-2 md:border-t md:border-line md:pt-6">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">
              Lire · Écouter · Étudier
            </p>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted sm:text-base sm:leading-8">
              Une publication numérique pour découvrir les œuvres disponibles, consulter leurs
              passages et remonter à leurs sources.
            </p>
          </div>
          <Link
            href="/recherche-ia"
            aria-label="Questionner le corpus avec des réponses sourcées"
            className="hidden"
          >
            <Bot size={20} />
          </Link>
        </div>
      </header>
      <form
        onSubmit={search}
        className="mx-auto flex h-16 w-[calc(100%-40px)] max-w-[1100px] items-center border-b border-ink bg-transparent px-0 lg:h-20"
      >
        <span className="mr-4 text-[10px] font-bold tracking-[.18em] text-gold">INDEX</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-muted sm:text-lg"
          placeholder="Rechercher une œuvre, un passage, un thème…"
          maxLength={120}
        />
        <button aria-label="Rechercher" className="flex items-center gap-2 text-brand">
          {loading ? (
            "…"
          ) : (
            <>
              <span className="hidden text-xs font-semibold sm:inline">Rechercher</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
      {error && (
        <p className="mx-auto mt-3 w-[calc(100%-40px)] max-w-[1336px] text-xs text-red-600">
          {error}
        </p>
      )}
      {readingProgress && (
        <section className="mx-auto max-w-[1400px] px-5 pt-6 lg:px-8">
          <div className="grid gap-5 border-y border-line py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className="text-[10px] font-bold tracking-[.18em] text-gold">REPRISE</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
                Reprendre la lecture
              </span>
              <h2 className="mt-1 text-lg font-bold text-slate-950">{readingProgress.title}</h2>
              <p className="mt-1 text-xs text-slate-600">
                {readingProgress.activeTab === "audio"
                  ? readingProgress.audioPosition
                    ? `Audio à ${formatDuration(readingProgress.audioPosition)}`
                    : "Reprendre l’écoute"
                  : readingProgress.page
                    ? `Page ${readingProgress.page}`
                    : "Reprendre au dernier passage"}
              </p>
            </div>
            <Link
              href={`/khassidas/${readingProgress.slug}?resume=1`}
              className="inline-flex h-11 items-center justify-center gap-2 border-b border-brand text-xs font-semibold uppercase tracking-[.12em] text-brand"
            >
              <BookOpen size={16} />
              Reprendre
            </Link>
          </div>
        </section>
      )}
      {featured ? (
        <section className="mx-auto max-w-[1380px] px-5 pt-16 lg:px-8 lg:pt-24">
          <div className="mb-7 flex items-end justify-between border-b border-line pb-4">
            <div>
              <span className="folio-label">Œuvre à découvrir · 002</span>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-.04em] sm:text-4xl">
                Ouvrir une œuvre
              </h2>
            </div>
            <Link
              href="/khassidas"
              className="text-xs font-semibold uppercase tracking-[.12em] text-brand"
            >
              Index complet →
            </Link>
          </div>
          <Link
            href={`/khassidas/${featured.slug}?tab=information`}
            className="group grid min-h-[430px] overflow-hidden border-y border-line bg-surface md:grid-cols-[.8fr_1.2fr] sm:min-h-[520px]"
          >
            <div className="manuscript-frame relative min-h-[320px] overflow-hidden md:order-2">
              <Image
                priority
                src={featuredCover ? featuredCover : "/images/open-manuscript.png"}
                alt={featuredCover ? `Couverture de ${featured.title}` : "Manuscrit de khassida"}
                fill
                unoptimized={Boolean(featured?.cover_url)}
                className={
                  featuredCover
                    ? "bg-surface object-contain object-center p-8"
                    : "object-cover opacity-85"
                }
              />
            </div>
            <div className="flex flex-col justify-end p-7 md:order-1 md:p-12 lg:p-16">
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">
                Sélection du corpus
              </span>
              {featured.arabic_title && (
                <p
                  dir="rtl"
                  className="mt-8 text-left font-arabic text-4xl leading-relaxed text-brand sm:text-6xl"
                >
                  {featured.arabic_title}
                </p>
              )}
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-ink sm:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-5 line-clamp-3 max-w-lg text-sm leading-7 text-muted sm:text-base">
                {featured.description ||
                  "Lire, comprendre et écouter cette œuvre de Cheikh Ahmadou Bamba."}
              </p>
              <div className="mt-8 flex items-center gap-7">
                <span className="flex h-12 items-center justify-center gap-2 border-b border-brand font-semibold text-brand">
                  <Play size={19} fill="currentColor" />
                  Découvrir
                </span>
                <span className="flex h-12 items-center justify-center gap-2 text-sm text-muted">
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
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-xl grid-cols-4 border-t border-line bg-surface/95 px-2 py-1 backdrop-blur-xl md:hidden">
        <MobileNav href="/" icon={Home} label="Accueil" active />
        <MobileNav href="/khassidas" icon={BookOpen} label="Lire" />
        <MobileNav href="/bibliotheque?type=audio" icon={Headphones} label="Écouter" />
        <MobileNav href="/search" icon={Search} label="Chercher" />
      </nav>
    </main>
  );
}
function formatDuration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
function MobileShelf({ title, works }: { title: string; works: Result[] }) {
  if (!works.length) return null;
  return (
    <section className="mx-auto max-w-[1380px] px-5 pt-16 lg:px-8 lg:pt-24">
      <div className="flex items-end justify-between border-b border-line pb-4">
        <div>
          <span className="folio-label">Sommaire</span>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{title}</h2>
        </div>
        <Link
          href="/khassidas"
          className="text-xs font-semibold uppercase tracking-[.12em] text-brand"
        >
          Voir tout
        </Link>
      </div>
      <div className="border-b border-line">
        {works.map(({ khassida }, index) => {
          return (
            <Link
              key={khassida.id}
              href={`/khassidas/${khassida.slug}?tab=information`}
              className="group grid grid-cols-[38px_minmax(0,1fr)_auto] items-center border-t border-line py-6 first:border-t-0 sm:grid-cols-[58px_minmax(0,1fr)_auto]"
            >
              <span className="text-[10px] font-bold tracking-[.16em] text-gold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                {khassida.arabic_title && (
                  <p dir="rtl" className="font-arabic text-xl leading-8 text-brand sm:text-2xl">
                    {khassida.arabic_title}
                  </p>
                )}
                <strong className="block text-base font-semibold text-ink sm:text-lg">
                  {khassida.title}
                </strong>
                <span className="text-[10px] uppercase tracking-[.12em] text-muted">
                  {khassida.themes?.[0] || "Œuvre"}
                </span>
              </div>
              <ArrowRight
                size={17}
                className="text-muted transition group-hover:translate-x-1 group-hover:text-brand"
              />
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
      className={`flex flex-col items-center gap-1 py-2 text-[9px] uppercase tracking-[.08em] ${active ? "font-semibold text-brand" : "text-muted"}`}
    >
      <Icon size={19} />
      <span>{label}</span>
    </Link>
  );
}
