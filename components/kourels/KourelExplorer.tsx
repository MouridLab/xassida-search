import Link from "next/link";
import { Headphones, Mic2, Play, Video } from "lucide-react";
import type { LibraryItem } from "@/types/library";

export function KourelExplorer({ items }: { items: LibraryItem[] }) {
  if (!items.length) {
    return (
      <div className="grid min-h-80 place-items-center border-y border-dashed border-line text-center">
        <div className="max-w-md px-6">
          <Mic2 className="mx-auto text-brand" size={34} />
          <h2 className="mt-5 text-xl font-semibold">Les prestations arrivent</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Les prestations validées seront publiées ici avec le nom du kourel, la date et leur
            source.
          </p>
        </div>
      </div>
    );
  }

  const groups = items.reduce((result, item) => {
    const key = item.author || "Kourel non renseigné";
    const group = result.get(key) || [];
    group.push(item);
    result.set(key, group);
    return result;
  }, new Map<string, LibraryItem[]>());
  return (
    <div className="space-y-14">
      {[...groups.entries()].map(([kourel, performances]) => (
        <section key={kourel}>
          <header className="flex items-end justify-between border-b border-line pb-4">
            <div>
              <span className="folio-label">Kourel</span>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">{kourel}</h2>
            </div>
            <span className="text-xs text-muted">
              {performances.length} prestation{performances.length > 1 ? "s" : ""}
            </span>
          </header>
          <div className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-3">
            {performances.map((item) => {
              const isVideo = item.item_type === "video";
              return (
                <Link
                  key={item.id}
                  href={`/bibliotheque/${item.slug}`}
                  className="group flex min-h-48 flex-col border border-line bg-surface p-5 transition hover:border-gold hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-full bg-brand/10 text-brand">
                      {isVideo ? <Video size={19} /> : <Headphones size={19} />}
                    </span>
                    <Play size={17} className="text-gold transition group-hover:scale-110" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold leading-7">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-3 pt-5 text-[10px] uppercase tracking-[.1em] text-muted">
                    <span>{isVideo ? "Vidéo" : "Audio"}</span>
                    {item.publication_year && <span>{item.publication_year}</span>}
                    {item.language && <span>{item.language}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
