"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Headphones,
  List,
  Maximize2,
  MessageSquareText,
  Minus,
  Play,
  Plus,
  Share2,
} from "lucide-react";
import type { Chunk, Khassida } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
type View = "parallel" | "arabic" | "translation";
type Tab =
  | "lecture"
  | "audio"
  | "information"
  | "chapters"
  | "comments"
  | "sources";
export function ReaderView({
  work,
  chunks,
  related,
}: {
  work: Khassida;
  chunks: Chunk[];
  related: Pick<Khassida, "slug" | "title" | "arabic_title">[];
}) {
  const [active, setActive] = useState(0),
    [view, setView] = useState<View>("parallel"),
    [tab, setTab] = useState<Tab>("lecture"),
    [fontSize, setFontSize] = useState(28);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunk = chunks[active];
  const pages = useMemo(
    () =>
      chunks.map((item, index) => ({
        index,
        page: item.page_number || index + 1,
        chapter: item.chapter_number || 1,
      })),
    [chunks],
  );
  const audioUrl = chunk?.audio_url || work.audio_url;
  const youtubeId = youtubeVideoId(audioUrl);
  function move(delta: number) {
    setActive((value) =>
      Math.max(0, Math.min(chunks.length - 1, value + delta)),
    );
  }
  async function copy() {
    const content = [
      chunk?.arabic_text,
      chunk?.transcription,
      chunk?.french_translation,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (content) await navigator.clipboard.writeText(content);
  }
  function play() {
    if (youtubeId) {
      document
        .getElementById("reader-audio")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    audioRef.current?.play().catch(() => {});
  }
  const tabs: [Tab, string][] = [
    ["lecture", "Lecture"],
    ["audio", "Audio"],
    ["information", "Informations"],
    ["chapters", "Chapitres"],
    ["comments", "Commentaires"],
    ["sources", "Sources"],
  ];
  return (
    <main className="pb-14">
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href="/">Accueil</Link>
            <span>›</span>
            <Link href="/khassidas">Khassaïdes</Link>
            <span>›</span>
            <strong className="truncate text-ink">{work.title}</strong>
          </nav>
          <div className="mt-7 grid gap-7 lg:grid-cols-[150px_1fr_auto]">
            <div className="relative grid h-52 w-36 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950 to-emerald-800 p-4 text-center text-gold shadow-xl">
              <span className="absolute inset-2 rounded border border-gold/30" />
              <span className="font-arabic text-2xl leading-10">
                {work.arabic_title || "خَصَائِد"}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  {work.title}
                </h1>
                {work.is_verified && (
                  <Badge className="border-success/15 bg-success/10 text-success">
                    <CheckCircle2 size={12} /> Vérifié
                  </Badge>
                )}
              </div>
              <p dir="rtl" className="mt-2 w-fit font-arabic text-3xl text-ink">
                {work.arabic_title}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                {work.description ||
                  "Œuvre de Cheikh Ahmadou Bamba disponible dans la bibliothèque Xassida Search."}
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
                <span>
                  <strong className="text-ink">{chunks.length || "—"}</strong>{" "}
                  passages
                </span>
                <span>
                  <strong className="text-ink">
                    {Math.max(0, ...chunks.map((c) => c.page_number || 0)) ||
                      "—"}
                  </strong>{" "}
                  pages
                </span>
                <span>
                  <strong className="text-ink">
                    {audioUrl ? "Disponible" : "—"}
                  </strong>{" "}
                  audio
                </span>
                <span>
                  <strong className="text-ink">Arabe</strong> langue
                </span>
              </div>
            </div>
            <div className="flex flex-wrap content-start gap-2 lg:max-w-[340px]">
              {[
                [BookOpen, "Lire", "primary"],
                [Headphones, "Écouter", "success"],
                [FileText, "PDF", "secondary"],
                [Bot, "Question IA", "secondary"],
              ].map(([Icon, label, kind]) => {
                const href =
                  label === "PDF"
                    ? work.pdf_url
                    : label === "Question IA"
                      ? "/recherche-ia"
                      : undefined;
                const cls = cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                  kind === "primary" && "bg-brand text-white",
                  kind === "success" && "bg-emerald-700 text-white",
                  kind === "secondary" &&
                    "border border-line bg-surface text-ink",
                );
                return href ? (
                  <a
                    key={String(label)}
                    href={href}
                    target={label === "PDF" ? "_blank" : undefined}
                    className={cls}
                  >
                    <Icon size={17} />
                    {String(label)}
                  </a>
                ) : (
                  <button
                    key={String(label)}
                    onClick={() =>
                      label === "Écouter" ? play() : setTab("lecture")
                    }
                    className={cls}
                  >
                    <Icon size={17} />
                    {String(label)}
                  </button>
                );
              })}
            </div>
          </div>
          <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
            {tabs.map(([id, label]) => (
              <button
                onClick={() => setTab(id)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted",
                  tab === id &&
                    "text-brand after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand",
                )}
                key={id}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </section>
      {tab === "lecture" || tab === "audio" ? (
        <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 xl:grid-cols-[250px_minmax(0,1fr)_300px] xl:px-6">
          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center gap-2 border-b border-line pb-3 text-xs font-semibold uppercase tracking-wider text-brand">
                <List size={16} /> Sommaire
              </div>
              <div className="mt-3 max-h-[65vh] space-y-1 overflow-y-auto">
                <p className="px-2 py-2 text-xs font-semibold text-ink">
                  Chapitre {chunk?.chapter_number || 1}
                </p>
                {pages.map((item) => (
                  <button
                    onClick={() => setActive(item.index)}
                    key={item.index}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-muted hover:bg-brand/5",
                      active === item.index &&
                        "bg-brand/10 font-semibold text-brand",
                    )}
                  >
                    <span>Passage {item.index + 1}</span>
                    <small>p. {item.page}</small>
                  </button>
                ))}
              </div>
            </div>
          </aside>
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFontSize((s) => Math.max(20, s - 2))}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas"
                  aria-label="Réduire le texte"
                >
                  <Minus size={15} />
                </button>
                <span className="px-1 text-xs text-muted">A</span>
                <button
                  onClick={() => setFontSize((s) => Math.min(42, s + 2))}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas"
                  aria-label="Agrandir le texte"
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex rounded-xl bg-canvas p-1">
                {[
                  ["arabic", "Arabe"],
                  ["translation", "Traduction"],
                  ["parallel", "Parallèle"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setView(id as View)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-[11px] font-semibold text-muted",
                      view === id && "bg-surface text-brand shadow-sm",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="grid size-9 place-items-center rounded-lg text-muted"
                aria-label="Plein écran"
              >
                <Maximize2 size={16} />
              </button>
            </header>
            {chunks.length ? (
              <article
                onClick={play}
                className="min-h-[440px] cursor-pointer px-5 py-10 sm:px-10 sm:py-14"
              >
                <div
                  className={cn(
                    "grid gap-8",
                    view === "parallel" && "lg:grid-cols-2",
                  )}
                >
                  <div className={cn(view === "translation" && "hidden")}>
                    <span className="mb-4 block text-xs font-semibold uppercase tracking-wider text-gold">
                      Texte arabe
                    </span>
                    <p
                      dir="rtl"
                      style={{ fontSize }}
                      className="font-arabic leading-[2.1] text-ink"
                    >
                      {chunk?.arabic_text ||
                        "Le texte arabe de ce passage n’est pas encore disponible."}
                    </p>
                  </div>
                  <div className={cn(view === "arabic" && "hidden")}>
                    <span className="mb-4 block text-xs font-semibold uppercase tracking-wider text-brand">
                      Traduction
                    </span>
                    <p className="text-base leading-8 text-ink">
                      {chunk?.french_translation ||
                        "Aucune traduction publiée pour ce passage."}
                    </p>
                    {chunk?.transcription && (
                      <div className="mt-7 border-t border-line pt-5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Translittération
                        </span>
                        <p className="mt-2 text-sm italic leading-7 text-muted">
                          {chunk.transcription}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-10 flex items-center justify-between border-t border-line pt-5 text-xs text-muted">
                  <span>
                    Chapitre {chunk?.chapter_number || 1} ·{" "}
                    {chunk?.verse_start
                      ? `Vers ${chunk.verse_start}${chunk.verse_end && chunk.verse_end !== chunk.verse_start ? `–${chunk.verse_end}` : ""}`
                      : `Page ${chunk?.page_number || active + 1}`}
                  </span>
                  <span className="text-brand">Cliquer pour écouter</span>
                </div>
              </article>
            ) : (
              <div className="grid min-h-[440px] place-items-center p-10 text-center">
                <div>
                  <BookOpen className="mx-auto text-brand" size={34} />
                  <h2 className="mt-4 font-semibold text-ink">
                    Texte en cours d’intégration
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    Le PDF original reste accessible depuis la fiche.
                  </p>
                </div>
              </div>
            )}
            <div
              id="reader-audio"
              className="border-t border-line bg-canvas p-4"
            >
              {youtubeId ? (
                <div className="overflow-hidden rounded-xl bg-black">
                  <iframe
                    className="aspect-video w-full"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
                    title={`Écouter ${work.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={play}
                    disabled={!audioUrl}
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-40"
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
                  {audioUrl ? (
                    <audio
                      ref={audioRef}
                      controls
                      className="h-10 w-full"
                      src={audioUrl}
                    />
                  ) : (
                    <span className="text-xs text-muted">
                      Aucun audio associé à ce passage.
                    </span>
                  )}
                </div>
              )}
            </div>
            <footer className="flex flex-wrap items-center gap-2 border-t border-line p-4">
              <button
                onClick={copy}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-canvas"
              >
                <Copy size={14} />
                Copier
              </button>
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-canvas">
                <Share2 size={14} />
                Partager
              </button>
              <span className="ml-auto flex gap-2">
                <button
                  disabled={active === 0}
                  onClick={() => move(-1)}
                  className="grid size-9 place-items-center rounded-lg border border-line"
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  disabled={active === chunks.length - 1}
                  onClick={() => move(1)}
                  className="grid size-9 place-items-center rounded-lg bg-brand text-white"
                >
                  <ArrowRight size={15} />
                </button>
              </span>
            </footer>
          </section>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
                <MessageSquareText size={16} /> Notes
              </h2>
              <p className="mt-4 text-sm leading-7 text-ink">
                {chunk?.commentary || "Aucune note publiée pour ce passage."}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand">
                  À lire ensuite
                </h2>
                <ChevronDown size={15} className="text-muted" />
              </div>
              <div className="mt-3 divide-y divide-line">
                {related.map((item) => (
                  <Link
                    href={`/khassidas/${item.slug}`}
                    className="block py-3"
                    key={item.slug}
                  >
                    <strong className="block text-xs text-ink">
                      {item.title}
                    </strong>
                    <small className="mt-1 block font-arabic text-sm text-muted">
                      {item.arabic_title}
                    </small>
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href="/recherche-ia"
              className="block rounded-2xl bg-gradient-to-br from-brand to-blue-700 p-5 text-white shadow-lift"
            >
              <Bot size={23} />
              <h2 className="mt-4 text-sm font-semibold">
                Poser une question IA
              </h2>
              <p className="mt-2 text-xs leading-5 text-blue-100">
                Interroger le corpus en conservant les sources.
              </p>
            </Link>
          </aside>
        </section>
      ) : (
        <InfoPanel tab={tab} work={work} chunks={chunks} />
      )}{" "}
    </main>
  );
}

function youtubeVideoId(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be"))
      return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.includes("youtube.com"))
      return (
        url.searchParams.get("v") ||
        url.pathname.split("/embed/")[1]?.split("/")[0] ||
        null
      );
  } catch {}
  return null;
}

function InfoPanel({
  tab,
  work,
  chunks,
}: {
  tab: Tab;
  work: Khassida;
  chunks: Chunk[];
}) {
  const content =
    tab === "information"
      ? [
          "Auteur : Cheikh Ahmadou Bamba",
          `Édition : ${work.source_name || "Non renseignée"}`,
          `Thèmes : ${work.themes.join(", ") || "Non renseignés"}`,
        ]
      : tab === "chapters"
        ? [...new Set(chunks.map((c) => `Chapitre ${c.chapter_number || 1}`))]
        : tab === "comments"
          ? (chunks.map((c) => c.commentary).filter(Boolean) as string[])
          : tab === "sources"
            ? [
                work.source_name || "Source non renseignée",
                work.pdf_url ? "Document PDF disponible" : "PDF non disponible",
              ]
            : [
                "Le lecteur audio utilise les récitations associées au document.",
              ];
  return (
    <section className="mx-auto max-w-[1000px] px-5 py-12">
      <div className="rounded-3xl border border-line bg-surface p-7 shadow-card sm:p-10">
        <h2 className="text-2xl font-semibold capitalize text-ink">{tab}</h2>
        <div className="mt-6 divide-y divide-line">
          {content.length ? (
            content.map((item, index) => (
              <p key={index} className="py-4 text-sm leading-7 text-muted">
                {item}
              </p>
            ))
          ) : (
            <p className="py-8 text-sm text-muted">
              Aucun contenu publié dans cette section.
            </p>
          )}
        </div>
        {tab === "sources" && work.pdf_url && (
          <a
            href={work.pdf_url}
            target="_blank"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white"
          >
            <Download size={16} />
            Consulter le PDF
          </a>
        )}
      </div>
    </section>
  );
}
