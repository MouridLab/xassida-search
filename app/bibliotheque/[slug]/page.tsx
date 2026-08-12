import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ExternalLink,
  Headphones,
  Languages,
  Mic2,
  Newspaper,
  ScrollText,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import { isConfigured, publicServerClient } from "@/lib/supabase";
import type { LibraryItem, LibraryItemType } from "@/types/library";

const types: Record<LibraryItemType, { label: string; icon: typeof BookOpen }> = {
  book: { label: "Livre", icon: BookOpen },
  article: { label: "Article", icon: Newspaper },
  biography: { label: "Biographie", icon: UserRound },
  conference: { label: "Conférence", icon: Mic2 },
  audio: { label: "Audio", icon: Headphones },
  video: { label: "Vidéo", icon: Video },
  manuscript: { label: "Manuscrit", icon: ScrollText },
  archive: { label: "Archive", icon: ScrollText },
};
const languages: Record<string, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  wo: "Wolof",
};

export default async function LibraryItemPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isConfigured) notFound();
  const { slug } = await params;
  const { data } = await publicServerClient()
    .from("library_items")
    .select("*")
    .eq("slug", slug)
    .eq("is_verified", true)
    .single();
  if (!data) notFound();
  const item = data as LibraryItem,
    meta = types[item.item_type],
    Icon = meta.icon;
  const youtubeId = youtubeVideoId(item.resource_url);
  return (
    <main className="min-h-screen bg-[#f8faf9] pb-20">
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <Link
          href="/bibliotheque"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"
        >
          <ArrowLeft size={16} />
          Retour à la bibliothèque
        </Link>
        <article className="mt-6 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.08)]">
          <header className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#07182c] px-6 py-12 text-white sm:px-10">
            <span className="absolute -right-16 -top-20 size-64 rounded-full bg-amber-200/10 blur-2xl" />
            <span className="relative inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Icon size={15} />
              {meta.label}
            </span>
            <h1
              dir={item.language === "ar" ? "rtl" : undefined}
              className="relative mt-6 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl"
            >
              {item.title}
            </h1>
            {item.subtitle && (
              <p className="relative mt-4 max-w-2xl text-sm leading-7 text-white/65">
                {item.subtitle}
              </p>
            )}
          </header>
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              {youtubeId && (
                <div className="mb-8 overflow-hidden rounded-2xl bg-black shadow-lg">
                  <iframe
                    className="aspect-video w-full"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
                    title={item.title}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {item.item_type === "audio" && item.resource_url && (
                <div className="mb-8 rounded-2xl bg-[#07182c] p-6 text-white">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                      <Headphones />
                    </span>
                    <div>
                      <strong>Collection audio</strong>
                      <p className="text-xs text-white/50">
                        Écouter depuis la fiche source référencée
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <section>
                <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
                  Présentation
                </span>
                <p
                  dir={item.language === "ar" ? "rtl" : undefined}
                  className="mt-4 text-base leading-8 text-slate-600"
                >
                  {item.description ||
                    "Cette ressource documentaire a été vérifiée et référencée dans la bibliothèque."}
                </p>
              </section>
              {item.themes.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {item.themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              )}
              {item.resource_url && !youtubeId && (
                <a
                  href={item.resource_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-800"
                >
                  Consulter le document original <ExternalLink size={14} />
                </a>
              )}
            </div>
            <aside className="space-y-3">
              <Info label="Type" value={meta.label} icon={Icon} />
              <Info
                label="Auteur / intervenant"
                value={item.author || "Non renseigné"}
                icon={UserRound}
              />
              <Info
                label="Langue"
                value={languages[item.language] || item.language}
                icon={Languages}
              />
              {item.publication_year && (
                <Info label="Année" value={String(item.publication_year)} icon={Calendar} />
              )}
              <Info
                label="Provenance"
                value={item.source_name || item.publisher || "Source référencée"}
                icon={ShieldCheck}
              />
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BookOpen;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
        <Icon size={13} />
        {label}
      </span>
      <p className="mt-2 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}
function youtubeVideoId(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com"))
      return url.searchParams.get("v") || url.pathname.split("/embed/")[1] || null;
  } catch {}
  return null;
}
