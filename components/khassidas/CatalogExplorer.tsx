"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Khassida } from "@/types/database";
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
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(initialTheme || "");
  const themes = useMemo(
    () => [...new Set(works.flatMap((work) => work.themes))].filter(Boolean).sort(),
    [works],
  );

  useEffect(() => {
    setTheme(initialTheme || "");
  }, [initialTheme]);

  const filtered = useMemo(
    () =>
      works.filter(
        (work) =>
          (!theme || work.themes.includes(theme)) &&
          (!query ||
            [work.title, work.arabic_title, ...work.aliases, ...work.themes]
              .join(" ")
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase())),
      ),
    [works, query, theme],
  );

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:flex-row">
        <label className="flex flex-1 items-center gap-3 px-2">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full bg-transparent text-sm outline-none"
            placeholder="Titre, mot arabe ou thème…"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-line px-3 text-sm text-muted">
          <SlidersHorizontal size={16} />
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="h-11 min-w-40 bg-transparent outline-none"
          >
            <option value="">Tous les thèmes</option>
            {themes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4">
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
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((work) => (
          <WorkCard key={work.id} work={work} stats={stats[work.id]} />
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
