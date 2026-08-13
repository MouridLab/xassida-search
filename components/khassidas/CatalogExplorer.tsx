"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Khassida } from "@/types/database";
import { normalizeTheme, uniqueThemeOptions } from "@/lib/catalog-themes";
import type { WorkStats } from "./WorkCard";
import { WorkCard } from "./WorkCard";

export function CatalogExplorer({
  works,
  stats,
  initialTheme,
}: {
  works: Khassida[];
  stats: Record<string, WorkStats>;
  initialTheme?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(() => normalizeTheme(initialTheme || ""));
  const themes = useMemo(() => uniqueThemeOptions(works.flatMap((work) => work.themes)), [works]);

  useEffect(() => {
    setTheme(normalizeTheme(initialTheme || ""));
  }, [initialTheme]);

  const filtered = useMemo(
    () =>
      works.filter(
        (work) => !theme || work.themes.some((workTheme) => normalizeTheme(workTheme) === theme),
      ),
    [works, theme],
  );

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim().length >= 2)
            router.push(`/search?q=${encodeURIComponent(query.trim())}&type=khassida`);
        }}
        className="editorial-filter grid sm:grid-cols-[1fr_auto]"
      >
        <label className="flex flex-1 items-center gap-3 px-2">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full bg-transparent text-sm outline-none"
            placeholder="Titre, mot arabe ou thème…"
          />
        </label>
        <label className="flex items-center gap-2 border-t border-line px-2 text-sm text-muted sm:border-l sm:border-t-0 sm:px-4">
          <SlidersHorizontal size={16} />
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="h-11 min-w-40 bg-transparent outline-none"
          >
            <option value="">Tous les thèmes</option>
            {themes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </form>
      <div className="mt-12 flex items-end justify-between gap-4">
        <p className="text-xs font-medium text-muted">
          {filtered.length} khassaida{filtered.length !== 1 ? "s" : ""}
          {theme && <> pour le thème « {theme} »</>}
        </p>
        {theme && (
          <button
            onClick={() => setTheme("")}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Effacer le filtre
          </button>
        )}
      </div>
      <div className="mt-5 border-b border-line">
        {filtered.map((work, index) => (
          <WorkCard key={work.id} work={work} stats={stats[work.id]} index={index} />
        ))}
      </div>
      {!filtered.length && (
        <div className="mt-8 rounded-2xl border border-dashed border-line py-16 text-center text-sm text-muted">
          Aucun khassaida ne correspond à cette recherche.
        </div>
      )}
    </>
  );
}
