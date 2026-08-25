import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
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
  const hostedDocument = item.media_object_key ? `/api/library-media/${item.id}` : null;
  return (
    <main className="min-h-screen bg-canvas pb-24">
      <div className="mx-auto max-w-[1180px] px-5 py-12 lg:px-8 lg:py-20">
        <Link
          href="/bibliotheque"
          className="inline-flex items-center gap-2 border-b border-line pb-1 text-[10px] font-bold uppercase tracking-[.14em] text-muted hover:text-brand"
        >
          <ArrowLeft size={16} />
          Retour à la bibliothèque
        </Link>
        <article className="mt-10">
          <header className="relative grid gap-8 border-y border-line py-10 sm:grid-cols-[60px_minmax(0,1fr)_220px] sm:py-16">
            <span className="hidden text-[10px] font-bold tracking-[.18em] text-gold sm:block">
              NOTICE
            </span>
            <div>
              <span className="folio-label">
                <Icon size={13} />
                {meta.label}
              </span>
              <h1
                dir={item.language === "ar" ? "rtl" : undefined}
                lang={item.language === "ar" ? "ar" : undefined}
                className={`mt-7 max-w-4xl font-semibold leading-[1.08] tracking-[-.05em] text-ink ${item.language === "ar" ? "font-arabic text-4xl sm:text-6xl" : "text-4xl sm:text-6xl"}`}
              >
                {item.title}
              </h1>
              {item.subtitle && (
                <p className="mt-5 max-w-2xl text-base leading-8 text-muted">{item.subtitle}</p>
              )}
            </div>
            <div className="border-t border-line pt-5 text-xs leading-6 text-muted sm:self-end">
              <p className="font-semibold text-ink">{item.author || "Auteur non renseigné"}</p>
              {item.publication_year && <p>{item.publication_year}</p>}
              <p className="mt-2">{item.source_name || item.publisher || "Source référencée"}</p>
            </div>
          </header>
          <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_250px] lg:py-16">
            <div>
              {youtubeId && (
                <div className="mb-12 overflow-hidden border-y border-line bg-black">
                  <iframe
                    className="aspect-video w-full"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
                    title={item.title}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {hostedDocument && item.media_mime_type === "application/pdf" && (
                <section className="mb-12 overflow-hidden border-y border-line bg-surface">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted">
                      <FileText size={15} className="text-brand" />
                      Document PDF
                    </span>
                    <a
                      href={hostedDocument}
                      download
                      className="border-b border-brand px-2 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-brand"
                    >
                      Télécharger
                    </a>
                  </div>
                  <iframe
                    src={`${hostedDocument}#view=FitH`}
                    title={`Lire ${item.title}`}
                    className="h-[72vh] min-h-[560px] w-full bg-white"
                  />
                </section>
              )}
              {hostedDocument && item.media_mime_type?.startsWith("audio/") && (
                <section className="mb-12 border-y border-line bg-surface px-4 py-7 sm:px-6">
                  <span className="folio-label">
                    <Headphones size={14} /> Prestation audio
                  </span>
                  <audio controls preload="metadata" src={hostedDocument} className="mt-5 w-full" />
                </section>
              )}
              {hostedDocument && item.media_mime_type?.startsWith("video/") && (
                <section className="mb-12 overflow-hidden border-y border-line bg-black">
                  <video
                    controls
                    preload="metadata"
                    src={hostedDocument}
                    className="aspect-video w-full"
                  />
                </section>
              )}
              {item.item_type === "audio" && item.resource_url && (
                <div className="mb-12 border-y border-line py-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center border border-gold text-brand">
                      <Headphones />
                    </span>
                    <div>
                      <strong>Collection audio</strong>
                      <p className="text-xs text-muted">
                        Écouter depuis la fiche source référencée
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <section>
                <span className="folio-label">Présentation</span>
                <p
                  dir={item.language === "ar" ? "rtl" : undefined}
                  className="mt-7 max-w-3xl text-base leading-8 text-muted sm:text-lg sm:leading-9"
                >
                  {item.description ||
                    "Cette ressource documentaire a été vérifiée et référencée dans la bibliothèque."}
                </p>
              </section>
              {item.themes.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5">
                  {item.themes.map((theme) => (
                    <span
                      key={theme}
                      className="border-b border-line py-1 text-[10px] font-bold uppercase tracking-[.12em] text-muted"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              )}
              {item.resource_url && !youtubeId && !hostedDocument && (
                <a
                  href={item.resource_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-10 inline-flex items-center gap-2 border-b border-brand py-2 text-xs font-semibold text-brand"
                >
                  Consulter le document original
                </a>
              )}
            </div>
            <aside className="border-t border-line lg:border-t-0">
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
    <div className="border-b border-line py-5">
      <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-muted">
        <Icon size={13} />
        {label}
      </span>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
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
