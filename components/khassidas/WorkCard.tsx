import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileText, Headphones } from "lucide-react";
import type { Khassida } from "@/types/database";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";

export type WorkStats = { verses?: number; pages?: number; hasAudio?: boolean; hasPdf?: boolean };

export function WorkCard({
  work,
  stats,
  className,
  index,
}: {
  work: Khassida;
  stats?: WorkStats;
  className?: string;
  index?: number;
}) {
  const cover = work.cover_url;
  return (
    <article
      className={cn(
        "group grid grid-cols-[42px_minmax(0,1fr)] border-t border-line py-7 sm:grid-cols-[64px_100px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:py-9",
        className,
      )}
    >
      <span className="pt-1 text-[10px] font-bold tracking-[.18em] text-gold sm:self-start">
        {String((index ?? 0) + 1).padStart(2, "0")}
      </span>
      <div className="manuscript-frame relative hidden aspect-[3/4] overflow-hidden border border-line bg-surface sm:block">
        {cover ? (
          <Image
            src={cover}
            alt={`Couverture de ${work.title}`}
            fill
            unoptimized={Boolean(work.cover_url)}
            sizes="100px"
            className="object-contain p-2"
          />
        ) : (
          <div className="grid size-full place-items-center px-3 text-center">
            {work.arabic_title ? (
              <span dir="rtl" className="font-arabic text-xl leading-9 text-brand">
                {work.arabic_title}
              </span>
            ) : (
              <FileText size={20} className="text-gold" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0">
        {work.arabic_title && (
          <p
            dir="rtl"
            lang="ar"
            className="font-arabic text-2xl leading-[1.7] text-ink sm:text-3xl"
          >
            {work.arabic_title}
          </p>
        )}
        <h3 className="mt-1 text-xl font-semibold tracking-[-.03em] text-ink sm:text-2xl">
          {work.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] uppercase tracking-[.1em] text-muted">
          {work.themes?.[0] && <span>{work.themes[0]}</span>}
          {stats?.verses ? <span>{stats.verses} vers</span> : null}
          {(stats?.hasPdf || work.pdf_url) && (
            <span className="inline-flex items-center gap-1">
              <FileText size={11} /> PDF
            </span>
          )}
          {(stats?.hasAudio || work.audio_url) && (
            <span className="inline-flex items-center gap-1">
              <Headphones size={11} /> Audio
            </span>
          )}
        </div>
      </div>
      <div className="col-start-2 mt-5 flex items-center gap-5 sm:col-start-auto sm:mt-0">
        <Link
          href={`/khassidas/${work.slug}?tab=lecture`}
          className="inline-flex min-h-11 items-center gap-3 border-b border-brand pb-1 text-xs font-semibold uppercase tracking-[.12em] text-brand"
        >
          Ouvrir <ArrowRight size={14} />
        </Link>
        {(stats?.hasAudio || work.audio_url) && (
          <Link
            href={`/khassidas/${work.slug}?tab=audio`}
            aria-label={`Écouter ${work.title}`}
            className="text-muted hover:text-brand"
          >
            <Headphones size={17} />
          </Link>
        )}
        <FavoriteButton
          compact
          work={{
            id: work.id,
            slug: work.slug,
            title: work.title,
            arabicTitle: work.arabic_title,
          }}
        />
      </div>
    </article>
  );
}
