"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Library } from "lucide-react";
import {
  highlightSegments,
  searchTypes,
  type SearchType,
  type UnifiedSearchResult,
} from "@/lib/unified-search";

type SearchResponse = {
  results: UnifiedSearchResult[];
  pagination: { page: number; limit: number; total: number; nextPage: number | null };
  error?: string;
};

const labels: Record<Exclude<SearchType, "all">, string> = {
  khassida: "Œuvres",
  passage: "Passages",
  library: "Bibliothèque",
};

export function SearchExperience({
  initialQuery,
  initialType,
  initialPage,
}: {
  initialQuery: string;
  initialType: string;
  initialPage: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchType>(
    searchTypes.includes(initialType as SearchType) ? (initialType as SearchType) : "all",
  );
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [pagination, setPagination] = useState<SearchResponse["pagination"] | null>(null);
  const [suggestions, setSuggestions] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
    setType(searchTypes.includes(initialType as SearchType) ? (initialType as SearchType) : "all");
  }, [initialQuery, initialType]);

  useEffect(() => {
    if (initialQuery.trim().length < 2) {
      setResults([]);
      setPagination(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/search?q=${encodeURIComponent(initialQuery)}&type=${encodeURIComponent(type)}&page=${initialPage}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const body = (await response.json()) as SearchResponse;
        if (!response.ok) throw new Error(body.error || "Recherche impossible");
        setResults(body.results);
        setPagination(body.pagination);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initialPage, initialQuery, type]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2 || value === initialQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value)}&type=khassida&limit=5`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((body: SearchResponse) => setSuggestions(body.results || []))
        .catch(() => undefined);
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [initialQuery, query]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        (["khassida", "passage", "library"] as const).map((kind) => [
          kind,
          results.filter((result) => result.type === kind),
        ]),
      ) as Record<Exclude<SearchType, "all">, UnifiedSearchResult[]>,
    [results],
  );

  function navigate(nextPage = 1, nextType = type) {
    const value = query.trim();
    if (value.length < 2) return;
    const params = new URLSearchParams({ q: value });
    if (nextType !== "all") params.set("type", nextType);
    if (nextPage > 1) params.set("page", String(nextPage));
    setSuggestions([]);
    router.push(`/search?${params.toString()}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    navigate(1);
  }

  return (
    <section className="mx-auto max-w-[1100px] px-5 py-16 lg:px-8 lg:py-24">
      <form onSubmit={submit} className="relative">
        <label className="flex h-16 items-center gap-3 border-y border-ink bg-transparent px-0 focus-within:border-brand">
          <span className="text-[10px] font-bold tracking-[.18em] text-gold">CONCORDANCE</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={120}
            className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none sm:text-lg"
            placeholder="Titre, alias, thème, passage, auteur…"
          />
          <button className="border-b border-brand py-2 text-xs font-semibold uppercase tracking-[.12em] text-brand">
            Chercher
          </button>
        </label>
        {suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-16 z-20 border border-line bg-surface p-3 shadow-xl">
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.id}
                href={suggestion.href}
                className="block border-b border-line px-3 py-3 text-sm last:border-0 hover:text-brand"
              >
                {suggestion.title}
                {suggestion.subtitle && (
                  <span className="ml-2 text-xs text-muted">{suggestion.subtitle}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </form>

      <div className="mt-5 flex flex-wrap gap-6 border-b border-line pb-4">
        {searchTypes.map((item) => (
          <button
            key={item}
            onClick={() => {
              navigate(1, item);
            }}
            className={`border-b py-2 text-[10px] font-bold uppercase tracking-[.14em] ${type === item ? "border-brand text-brand" : "border-transparent text-muted"}`}
          >
            {item === "all" ? "Tout" : labels[item]}
          </button>
        ))}
      </div>

      {initialQuery.trim().length < 2 ? (
        <EmptyState text="Saisissez au moins deux caractères pour rechercher dans tout le corpus." />
      ) : loading ? (
        <EmptyState text="Recherche en cours…" />
      ) : error ? (
        <EmptyState text={error} />
      ) : results.length === 0 ? (
        <EmptyState text={`Aucun résultat pour « ${initialQuery} ».`} />
      ) : (
        <div className="mt-14 space-y-20">
          {(["khassida", "passage", "library"] as const).map((kind) =>
            grouped[kind].length ? (
              <div key={kind}>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold tracking-[.18em] text-gold">
                    {kind === "khassida" ? "01" : kind === "passage" ? "02" : "03"}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-[-.04em]">{labels[kind]}</h2>
                </div>
                <div className="mt-5 border-b border-line">
                  {grouped[kind].map((result) => (
                    <ResultCard
                      key={`${result.type}-${result.id}`}
                      result={result}
                      query={initialQuery}
                    />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {pagination && pagination.total > pagination.limit && (
        <nav className="mt-10 flex items-center justify-between text-xs">
          <button
            disabled={pagination.page <= 1}
            onClick={() => navigate(pagination.page - 1)}
            className="rounded-xl border border-line px-4 py-2 disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-muted">
            Page {pagination.page} · {pagination.total} résultats
          </span>
          <button
            disabled={!pagination.nextPage}
            onClick={() => pagination.nextPage && navigate(pagination.nextPage)}
            className="rounded-xl border border-line px-4 py-2 disabled:opacity-40"
          >
            Suivant
          </button>
        </nav>
      )}
    </section>
  );
}

function ResultCard({ result, query }: { result: UnifiedSearchResult; query: string }) {
  const Icon =
    result.type === "passage" ? FileText : result.type === "library" ? Library : BookOpen;
  const reference = [
    result.chapter && `chapitre ${result.chapter}`,
    result.verseStart && `vers ${result.verseStart}${result.verseEnd ? `–${result.verseEnd}` : ""}`,
    result.page && `page ${result.page}`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      href={result.href}
      className={`group block border-t border-line py-7 transition hover:border-brand ${result.type === "passage" ? "sm:ml-12 sm:py-10" : ""}`}
    >
      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 sm:grid-cols-[42px_minmax(0,1fr)_auto]">
        <Icon size={16} className="mt-1 shrink-0 text-gold" />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-[-.02em] text-ink">{result.title}</h3>
          {(reference || result.subtitle) && (
            <p className="mt-1 text-xs text-muted">{reference || result.subtitle}</p>
          )}
          {result.excerpt && (
            <p
              className={`mt-4 line-clamp-4 leading-7 ${result.type === "passage" ? "text-base text-ink/80 sm:text-lg sm:leading-8" : "text-sm text-muted"}`}
            >
              {highlightSegments(result.excerpt, query).map((segment, index) =>
                segment.highlighted ? (
                  <mark key={index} className="rounded bg-amber-200 px-0.5 text-inherit">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-8 grid min-h-56 place-items-center rounded-2xl border border-dashed border-line text-center text-sm text-muted">
      {text}
    </div>
  );
}
