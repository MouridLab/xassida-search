"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { readFavorites, type FavoriteWork } from "@/lib/favorites";

export function FavoritesExperience() {
  const [favorites, setFavorites] = useState<FavoriteWork[]>([]);
  useEffect(() => setFavorites(readFavorites(window.localStorage)), []);
  return favorites.length ? (
    <div className="border-b border-line">
      {favorites.map((work, index) => (
        <Link
          key={work.id}
          href={`/khassidas/${work.slug}`}
          className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-7"
        >
          <span className="text-[10px] font-bold tracking-[.16em] text-gold">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>
            {work.arabicTitle && (
              <span dir="rtl" className="block w-fit font-arabic text-xl text-brand">
                {work.arabicTitle}
              </span>
            )}
            <strong className="mt-1 block text-lg">{work.title}</strong>
          </span>
          <ArrowRight size={17} className="text-brand" />
        </Link>
      ))}
    </div>
  ) : (
    <div className="grid min-h-72 place-items-center border-y border-dashed border-line text-center">
      <div className="max-w-sm px-6">
        <Heart className="mx-auto text-brand" />
        <h2 className="mt-4 text-lg font-semibold">Aucun favori</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Ajoutez un khassaïde depuis sa fiche pour le retrouver ici.
        </p>
        <Link
          href="/khassidas"
          className="mt-5 inline-flex border-b border-brand py-2 text-xs font-semibold text-brand"
        >
          Explorer les khassaïdes
        </Link>
      </div>
    </div>
  );
}
