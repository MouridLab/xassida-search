import Link from "next/link";
import Image from "next/image";
import { BookOpen, CheckCircle2, Eye, FileText, Headphones } from "lucide-react";
import type { Khassida } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type WorkStats = { verses?: number; pages?: number; hasAudio?: boolean; hasPdf?: boolean };
export function WorkCard({
  work,
  stats,
  className,
}: {
  work: Khassida;
  stats?: WorkStats;
  className?: string;
}) {
  const cover = work.cover_url;
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_12px_35px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-lift",
        className,
      )}
    >
      <div className="flex min-h-36 gap-4 p-4 pb-3">
        <div
          className={cn(
            "relative grid h-32 w-[88px] shrink-0 place-items-center overflow-hidden rounded-xl p-2 text-center shadow-sm",
            cover
              ? "border border-slate-200 bg-white"
              : "bg-gradient-to-br from-emerald-950 to-emerald-800 text-gold",
          )}
        >
          {cover ? (
            <Image
              src={cover}
              alt={`Couverture de ${work.title}`}
              fill
              unoptimized={Boolean(work.cover_url)}
              sizes="80px"
              className="object-contain p-1"
            />
          ) : (
            <>
              <span className="absolute inset-1 rounded border border-gold/30" />
              <span className="font-arabic text-lg leading-7">
                {work.arabic_title || "خَصَائِد"}
              </span>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <Badge className="w-fit border-success/15 bg-success/10 px-2.5 py-1 text-success">
            <CheckCircle2 size={12} /> Vérifié
          </Badge>
          <h3 className="mt-3 line-clamp-2 text-[17px] font-bold leading-6 tracking-tight text-ink">
            {work.title}
          </h3>
          <p dir="rtl" className="mt-1 line-clamp-1 font-arabic text-xl leading-8 text-muted">
            {work.arabic_title}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
            {stats?.verses ? (
              <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                <BookOpen size={11} />
                {stats.verses} vers
              </span>
            ) : null}
            {(stats?.hasPdf || work.pdf_url) && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                <FileText size={11} />
                {stats?.pages ? `${stats.pages} pages` : "PDF"}
              </span>
            )}
            {(stats?.hasAudio || work.audio_url) && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                <Headphones size={11} />
                Audio
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3 sm:translate-y-full sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-white/95 sm:backdrop-blur sm:transition sm:duration-300 sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0">
        <Link
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          href={`/khassidas/${work.slug}?tab=lecture`}
        >
          <BookOpen size={14} />
          Lire
        </Link>
        {(stats?.hasAudio || work.audio_url) && (
          <Link
            className="grid size-11 place-items-center rounded-xl border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
            href={`/khassidas/${work.slug}?tab=audio`}
            aria-label="Écouter"
          >
            <Headphones size={14} />
          </Link>
        )}
        <Link
          className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-brand/20 hover:text-brand"
          href={`/khassidas/${work.slug}?tab=information`}
          aria-label="Voir"
        >
          <Eye size={14} />
        </Link>
      </div>
    </article>
  );
}
