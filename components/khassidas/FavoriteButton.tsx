"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { readFavorites, toggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  work,
  compact = false,
}: {
  work: { id: string; slug: string; title: string; arabicTitle?: string | null };
  compact?: boolean;
}) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    setFavorite(readFavorites(window.localStorage).some((item) => item.id === work.id));
  }, [work.id]);

  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={
        favorite ? `Retirer ${work.title} des favoris` : `Ajouter ${work.title} aux favoris`
      }
      onClick={() => setFavorite(toggleFavorite(window.localStorage, work))}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 text-xs font-semibold transition",
        compact ? "min-w-11" : "border-b border-line px-2",
        favorite ? "text-red-700" : "text-muted hover:text-red-700",
      )}
    >
      <Heart size={17} fill={favorite ? "currentColor" : "none"} />
      {!compact && <span>{favorite ? "Favori" : "Ajouter aux favoris"}</span>}
    </button>
  );
}
