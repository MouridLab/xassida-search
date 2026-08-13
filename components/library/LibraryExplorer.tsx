"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  FileText,
  Headphones,
  Library,
  Mic2,
  Newspaper,
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
  const router = useRouter();
  const [category, setCategory] = useState<LibraryItemType | "all">("all"),
    [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return items.filter((item) => category === "all" || item.item_type === category);
  }, [category, items]);
  return (
    <div>
      <div className="border-y border-line py-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length >= 2)
              router.push(`/search?q=${encodeURIComponent(query.trim())}&type=library`);
          }}
          className="flex h-12 items-center gap-3 border-b border-ink px-0 focus-within:border-brand"
        >
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Rechercher un livre, un auteur, une conférence…"
          />
        </form>
        <div className="mt-4 flex gap-6 overflow-x-auto pb-1">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`flex shrink-0 items-center gap-2 border-b py-2 text-[10px] font-bold uppercase tracking-[.12em] transition ${category === id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 flex items-end justify-between">
        <div>
          <span className="folio-label">Ressources documentaires</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
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
        <div className="mt-8 border-b border-line">
          {filtered.map((item, index) => {
            const meta = categories.find((x) => x.id === item.item_type),
              Icon = meta?.icon || FileText;
            const card = (
              <article className="group grid grid-cols-[42px_minmax(0,1fr)] border-t border-line py-7 sm:grid-cols-[60px_38px_minmax(0,1fr)_180px_auto] sm:items-start sm:gap-5 sm:py-9">
                <span className="text-[10px] font-bold tracking-[.16em] text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon size={18} className="hidden text-brand sm:block" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[.16em] text-muted">
                    {meta?.label}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold leading-7 tracking-[-.025em] sm:text-2xl">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-muted">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="col-start-2 mt-4 text-xs leading-6 text-muted sm:col-start-auto sm:mt-0">
                  {item.author && <p className="font-semibold text-ink">{item.author}</p>}
                  {item.publication_year && <p>{item.publication_year}</p>}
                  {item.source_name && <p className="mt-2 line-clamp-2">{item.source_name}</p>}
                </div>
                <span className="col-start-2 mt-4 border-b border-brand pb-1 text-[10px] font-bold uppercase tracking-[.12em] text-brand sm:col-start-auto sm:mt-0">
                  Consulter →
                </span>
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
