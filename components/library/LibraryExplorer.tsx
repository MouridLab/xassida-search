"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  FileText,
  Headphones,
  Library,
  Mic2,
  Newspaper,
  Play,
  Search,
  ScrollText,
  UserRound,
  Video,
} from "lucide-react";
import type { LibraryItem, LibraryItemType } from "@/types/library";
const categories: Array<{ id: LibraryItemType | "all"; label: string; icon: typeof Library }> = [
  { id: "all", label: "Tout", icon: Library },
  { id: "book", label: "Livres", icon: BookOpen },
  { id: "article", label: "Articles", icon: Newspaper },
  { id: "biography", label: "Biographies", icon: UserRound },
  { id: "conference", label: "Conférences", icon: Mic2 },
  { id: "audio", label: "Audios", icon: Headphones },
  { id: "video", label: "Vidéos", icon: Video },
  { id: "manuscript", label: "Manuscrits", icon: ScrollText },
  { id: "archive", label: "Archives", icon: Archive },
];
export function LibraryExplorer({ items }: { items: LibraryItem[] }) {
  const [category, setCategory] = useState<LibraryItemType | "all">("all"),
    [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === "all" || item.item_type === category) &&
        (!q ||
          [item.title, item.subtitle, item.author, item.description, ...item.themes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [category, items, query]);
  return (
    <div>
      <div className="rounded-3xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <label className="flex h-12 items-center gap-3 rounded-2xl bg-slate-50 px-4 ring-1 ring-slate-200 focus-within:ring-brand/30">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Rechercher un livre, un auteur, une conférence…"
          />
        </label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${category === id ? "bg-emerald-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
            Ressources documentaires
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {category === "all"
              ? "Toute la bibliothèque"
              : categories.find((x) => x.id === category)?.label}
          </h2>
        </div>
        <span className="text-xs text-muted">
          {filtered.length} ressource{filtered.length !== 1 && "s"}
        </span>
      </div>
      {filtered.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const meta = categories.find((x) => x.id === item.item_type),
              Icon = meta?.icon || FileText;
            const card = (
              <article className="group h-full overflow-hidden rounded-3xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-gradient-to-br from-emerald-950 to-emerald-700 text-white">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon size={40} className="text-amber-200" />
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur">
                    {meta?.label}
                  </span>
                  {["audio", "video"].includes(item.item_type) && (
                    <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white text-slate-950 shadow">
                      <Play size={15} fill="currentColor" />
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="line-clamp-2 font-bold leading-6">{item.title}</h3>
                  {item.author && <p className="mt-1 text-xs text-emerald-700">{item.author}</p>}
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">
                    {item.description || item.subtitle || "Ressource documentaire vérifiée."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.themes.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
            return (
              <Link key={item.id} href={`/bibliotheque/${item.slug}`}>
                {card}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
          <div className="max-w-md px-6">
            <Archive className="mx-auto text-emerald-700" size={32} />
            <h3 className="mt-4 font-bold">Aucune ressource publiée</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Cette catégorie accueillera des documents validés indépendamment du catalogue des
              khassaïdes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
