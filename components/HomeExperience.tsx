"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Headphones,
  Home,
  Info,
  Library,
  Play,
  Search,
} from "lucide-react";
import type { Khassida } from "@/types/database";
import type { WorkStats } from "@/components/khassidas/WorkCard";
import { cn } from "@/lib/utils";
type Result = { kind: "khassida" | "chunk"; khassida: Khassida; stats?: WorkStats };

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
    <HomeView
      works={works}
      query={query}
      setQuery={setQuery}
      search={search}
      loading={loading}
      error={error}
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
