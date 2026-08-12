"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookMarked,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  FolderHeart,
  Headphones,
  Home,
  Info,
  Library,
  Languages,
  Menu,
  MessageSquare,
  Minus,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Tags,
  UserRound,
  X,
} from "lucide-react";
import type { Chunk, Khassida, KhassidaEdition } from "@/types/database";
import { cn } from "@/lib/utils";

type Tab = "lecture" | "audio" | "information";
type RelatedWork = Pick<Khassida, "slug" | "title" | "arabic_title" | "cover_url"> & {
  shared_themes: string[];
  relevance: number;
};
const mainLinks = [
  [Home, "Accueil", "/"],
  [FileText, "Khassaïdes", "/khassidas"],
  [Library, "Bibliothèque", "/bibliotheque"],
  [Tags, "Thèmes", "/themes"],
  [FolderHeart, "Collections", "/collections"],
  [Bot, "Recherche IA", "/recherche-ia"],
  [CircleHelp, "À propos", "/a-propos"],
] as const;

export function ReaderView({
  work,
  chunks,
  editions,
  related,
  relatedMode,
  initialTab,
}: {
  work: Khassida;
  chunks: Chunk[];
  editions: KhassidaEdition[];
  related: RelatedWork[];
  relatedMode: "related" | "discover";
  initialTab?: string;
}) {
  const requestedTab: Tab = ["lecture", "audio", "information"].includes(initialTab || "")
    ? (initialTab as Tab)
    : "lecture";
  const [active, setActive] = useState(0),
    [tab, setTab] = useState<Tab>(requestedTab),
    [fontSize, setFontSize] = useState(29),
    [menu, setMenu] = useState(false),
    [playing, setPlaying] = useState(false),
    [audioOpen, setAudioOpen] = useState(false),
    [audioError, setAudioError] = useState(""),
    [progress, setProgress] = useState(0),
    [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLMediaElement>(null);
  const chunk = chunks[active];
  const audioUrl = chunk?.audio_url || work.audio_url;
  const youtubeId = youtubeVideoId(audioUrl);
  const detectedPages = Math.max(0, ...chunks.map((c) => c.page_number || 0));
  const displayedPages = work.page_count || detectedPages;
  const detectedVerses = Math.max(0, ...chunks.map((c) => c.verse_end || c.verse_start || 0));
  const displayedVerses = work.verse_count || detectedVerses;
  const pages = useMemo(
    () =>
      chunks.map((item, index) => ({
        index,
        page: item.page_number || index + 1,
        chapter: item.chapter_number || 1,
        verse: item.verse_start || index + 1,
      })),
    [chunks],
  );
  useEffect(() => {
    setProgress(0);
    setPlaying(false);
  }, [audioUrl]);
  async function toggleAudio() {
    if (youtubeId) {
      document
        .getElementById("youtube-player")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      setAudioError("");
      try {
        await el.play();
      } catch {
        setAudioError("Ce fichier audio est indisponible ou son format n’est pas pris en charge.");
      }
    } else el.pause();
  }
  function seek(value: number) {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = value;
    setProgress(value);
  }
  function openAudio() {
    setTab("audio");
    if (youtubeId) void toggleAudio();
    else if (window.matchMedia("(max-width: 767px)").matches) setAudioOpen(true);
    else void toggleAudio();
  }
  return (
    <div className="relative z-[60] -mt-[72px] min-h-screen bg-[#f8faf9] pb-24 text-ink">
      <ReaderTopbar onMenu={() => setMenu(true)} />
      {menu && <MobileDrawer onClose={() => setMenu(false)} />}
      <main className="mx-auto min-w-0 max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-64px-76px)] gap-6 xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-w-0">
            <nav className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/">Accueil</Link>
              <ChevronRight size={12} />
              <Link href="/khassidas">Khassaïdes</Link>
              <ChevronRight size={12} />
              <strong className="truncate text-ink">{work.title}</strong>
            </nav>
            <section className="relative mt-5 grid grid-cols-[82px_minmax(0,1fr)] gap-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,.07)] sm:grid-cols-[105px_minmax(0,1fr)] sm:gap-6 sm:p-7">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-700 via-brand to-amber-400" />
              <BookCover work={work} />
              <div className="min-w-0 py-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-[-.04em] text-slate-950 sm:text-[34px]">
                    {work.title}
                  </h1>
                  {work.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                      <CheckCircle2 size={12} />
                      Vérifié
                    </span>
                  )}
                </div>
                <p dir="rtl" className="mt-1 w-fit font-arabic text-2xl sm:text-3xl">
                  {work.arabic_title}
                </p>
                <p className="mt-3 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-500 sm:line-clamp-none sm:text-sm sm:leading-6">
                  {work.description ||
                    "Œuvre de Cheikh Ahmadou Bamba disponible dans la bibliothèque Xassida Search."}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
                  {displayedVerses > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={13} />
                      <b className="text-ink">{displayedVerses}</b> vers
                    </span>
                  ) : chunks.length > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={13} />
                      <b className="text-ink">{chunks.length}</b> passages
                    </span>
                  ) : null}
                  {displayedPages > 0 && (
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} />
                      <b className="text-ink">{displayedPages}</b> pages
                    </span>
                  )}
                  {audioUrl && (
                    <span className="flex items-center gap-1.5">
                      <Headphones size={13} />
                      <b className="text-ink">Audio</b> disponible
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <BookMarked size={13} />
                    <b className="text-ink">Arabe</b>
                  </span>
                </div>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-5 sm:flex">
                {" "}
                <ActionButton
                  icon={BookOpen}
                  label="Lire"
                  active={tab === "lecture"}
                  onClick={() => setTab("lecture")}
                />
                <ActionButton
                  icon={Headphones}
                  label="Écouter"
                  green
                  active={tab === "audio"}
                  onClick={openAudio}
                />
                <ActionButton
                  icon={Info}
                  label="Informations clés"
                  active={tab === "information"}
                  onClick={() => setTab("information")}
                />
                <Link
                  href="/recherche-ia"
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-5 text-xs font-semibold"
                >
                  <Bot size={15} />
                  Poser une question IA
                </Link>
              </div>
            </section>
            {tab === "lecture" ? (
              <ReaderContent
                work={work}
                chunks={chunks}
                editions={editions}
                pages={pages}
                active={active}
                setActive={setActive}
                fontSize={fontSize}
                setFontSize={setFontSize}
                play={toggleAudio}
                youtubeId={youtubeId}
              />
            ) : tab === "audio" ? (
              <AudioPanel
                work={work}
                playing={playing}
                progress={progress}
                duration={duration}
                error={audioError}
                disabled={!audioUrl}
                onToggle={toggleAudio}
                onSeek={seek}
              />
            ) : (
              <TabContent tab={tab} work={work} chunks={chunks} />
            )}
          </div>
          <ReaderAside
            work={work}
            chunks={chunks}
            related={related}
            relatedMode={relatedMode}
            progress={duration ? Math.round((progress / duration) * 100) : 0}
          />
        </div>
      </main>
      {youtubeId ? (
        <div
          id="youtube-player"
          className="fixed bottom-20 right-4 z-[80] hidden w-[360px] overflow-hidden rounded-2xl border border-line bg-black shadow-2xl md:block"
        >
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
            title={`Écouter ${work.title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        audioUrl && (
          <audio
            ref={audioRef as React.RefObject<HTMLAudioElement>}
            src={audioUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
            onError={() => setAudioError("Impossible de charger ce fichier audio.")}
          />
        )
      )}
      {audioOpen && audioUrl && !youtubeId && (
        <MobileAudioPlayer
          work={work}
          chunk={chunk}
          playing={playing}
          progress={progress}
          duration={duration}
          error={audioError}
          onClose={() => setAudioOpen(false)}
          onToggle={toggleAudio}
          onSeek={seek}
        />
      )}
    </div>
  );
}

function ReaderTopbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center border-b border-line bg-white/95 px-4 shadow-sm backdrop-blur-xl lg:px-8">
      <button
        onClick={onMenu}
        className="mr-3 grid size-9 place-items-center rounded-lg lg:hidden"
        aria-label="Menu"
      >
        <Menu size={19} />
      </button>
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/5 font-arabic text-xl text-brand">
          خ
        </span>
        <span>
          <strong className="block text-sm">Xassida Search</strong>
          <small className="hidden text-[8px] text-muted sm:block">
            Les écrits de Cheikh Ahmadou Bamba
          </small>
        </span>
      </Link>
      <label className="ml-8 hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-lg bg-canvas px-3 lg:flex">
        <Search size={14} className="text-muted" />
        <input
          className="w-full bg-transparent text-[11px] outline-none"
          placeholder="Rechercher un khassida, un vers, un thème…"
        />
        <kbd className="text-[9px] text-muted">Ctrl K</kbd>
      </label>
      <nav className="ml-auto hidden items-center gap-7 xl:flex">
        <Link
          href="/bibliotheque"
          className="flex items-center gap-2 text-[11px] font-medium text-muted"
        >
          <Library size={14} />
          Bibliothèque
        </Link>
        <Link
          href="/collections"
          className="flex items-center gap-2 text-[11px] font-medium text-muted"
        >
          <FolderHeart size={14} />
          Collections
        </Link>
        <Link
          href="/recherche-ia"
          className="flex items-center gap-2 text-[11px] font-medium text-muted"
        >
          <Bot size={14} />
          Recherche IA
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-1 xl:ml-7">
        <button className="grid size-9 place-items-center rounded-lg text-muted">
          <Moon size={16} />
        </button>
        <button className="grid size-9 place-items-center rounded-lg text-muted">
          <Bell size={16} />
        </button>
        <button className="grid size-9 place-items-center rounded-full bg-brand/10 text-brand">
          <UserRound size={16} />
        </button>
      </div>
    </header>
  );
}
function MobileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/30 lg:hidden" onClick={onClose}>
      <aside
        className="h-full w-[280px] bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <strong>Xassida Search</strong>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <nav className="mt-7 space-y-1">
          {mainLinks.map(([Icon, label, href]) => (
            <Link
              onClick={onClose}
              href={href}
              key={href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted"
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  );
}
function BookCover({ work }: { work: Khassida }) {
  const cover = work.cover_url;
  if (cover) {
    return (
      <div className="relative h-28 w-[82px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,.12)] sm:h-36 sm:w-[105px]">
        <Image
          src={cover}
          alt={`Calligraphie de ${work.title}`}
          fill
          unoptimized={Boolean(work.cover_url)}
          sizes="(min-width: 640px) 105px, 82px"
          className="object-contain p-1.5"
        />
      </div>
    );
  }

  return (
    <div className="relative grid h-28 w-[82px] place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950 to-emerald-800 p-2 text-center text-gold shadow-[0_10px_24px_rgba(6,78,59,.2)] sm:h-36 sm:w-[105px]">
      <span className="absolute inset-1.5 rounded border border-gold/40" />
      <span className="font-arabic text-lg leading-8 sm:text-2xl">
        {work.arabic_title || "خَصَائِد"}
      </span>
    </div>
  );
}
function ActionButton({
  icon: Icon,
  label,
  active,
  green,
  onClick,
}: {
  icon: typeof BookOpen;
  label: string;
  active?: boolean;
  green?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-5 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm",
        active && !green && "border-brand bg-brand text-white",
        green && "border-emerald-700 bg-emerald-700 text-white",
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function ReaderContent({
  work,
  chunks,
  editions,
  pages,
  active,
  setActive,
  fontSize,
  setFontSize,
  play,
  youtubeId,
}: {
  work: Khassida;
  chunks: Chunk[];
  editions: KhassidaEdition[];
  pages: { index: number; page: number; chapter: number; verse: number }[];
  active: number;
  setActive: (v: number) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  play: () => void;
  youtubeId: string | null;
}) {
  const chunk = chunks[active];
  const documents = [
    ...(work.pdf_url ? [{ id: "primary", language: "ar", edition_kind: "original" as const, title: "Original arabe", translator: null, publisher: null, publication_year: null, page_count: work.page_count, source_name: work.source_name, file_name: "original.pdf", validation_status: "verified" as const, khassida_id: work.id, url: work.pdf_url }] : []),
    ...editions,
  ];
  const [editionId, setEditionId] = useState(documents[0]?.id || "");
  const selectedEdition = documents.find((edition) => edition.id === editionId) || documents[0];
  return (
    <div className={cn("mt-4 grid gap-4", !selectedEdition && pages.length && "md:grid-cols-[145px_minmax(0,1fr)]")}>
      {!selectedEdition && pages.length > 0 && (
        <aside className="hidden rounded-2xl border border-line bg-white p-4 md:block">
          <strong className="text-[10px] uppercase tracking-wider text-brand">Sommaire</strong>
          <p className="mt-4 text-[10px] font-semibold">Chapitre {chunk?.chapter_number || 1}</p>
          <div className="mt-2 space-y-0.5">
            {pages.slice(0, 24).map((item) => (
              <button
                key={item.index}
                onClick={() => setActive(item.index)}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-[10px] text-muted",
                  active === item.index && "bg-brand/10 font-semibold text-brand",
                )}
              >
                Vers {item.verse}
              </button>
            ))}
          </div>
        </aside>
      )}
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {documents.length > 1 && (
          <header className="flex flex-wrap items-center gap-3 border-b border-line bg-slate-50 p-3">
            <Languages size={16} className="text-brand" />
            <label className="text-[10px] font-semibold text-slate-600">Édition</label>
            <select value={selectedEdition?.id || ""} onChange={(event) => setEditionId(event.target.value)} className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">
              {documents.map((edition) => <option key={edition.id} value={edition.id}>{editionLabel(edition)}</option>)}
            </select>
            {selectedEdition?.translator && <span className="text-[10px] text-slate-500">Traduit par {selectedEdition.translator}</span>}
          </header>
        )}
        {!selectedEdition && chunks.length > 0 && (
          <header className="flex items-center justify-between border-b border-line p-3">
            <select className="rounded-md border border-line bg-surface px-3 py-2 text-[10px]">
              <option>Arabe + Traduction</option>
              <option>Arabe seul</option>
              <option>Traduction seule</option>
            </select>
            <div className="flex gap-1">
              <button
                onClick={() => setFontSize((s) => Math.max(20, s - 2))}
                className="grid size-8 place-items-center rounded-md bg-canvas"
              >
                <Minus size={13} />
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(42, s + 2))}
                className="grid size-8 place-items-center rounded-md bg-canvas"
              >
                <Plus size={13} />
              </button>
              <button className="grid size-8 place-items-center rounded-md bg-canvas">
                <BookMarked size={13} />
              </button>
              <button className="grid size-8 place-items-center rounded-md bg-canvas">
                <Settings size={13} />
              </button>
            </div>
          </header>
        )}
        {selectedEdition ? (
          <iframe
            src={`${selectedEdition.url}#toolbar=1&navpanes=0&view=FitH`}
            title={`Lire ${selectedEdition.title || work.title}`}
            className="h-[calc(100vh-190px)] min-h-[680px] w-full bg-slate-100"
          />
        ) : chunks.length ? (
          <div className="space-y-3 bg-canvas/40 p-3 sm:p-4">
            {chunks.slice(active, active + 3).map((item, index) => (
              <VerseCard
                key={item.id}
                chunk={item}
                number={item.verse_start || active + index + 1}
                fontSize={fontSize}
                onPlay={play}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[500px] place-items-center text-center">
            <div>
              <BookOpen className="mx-auto text-brand" />
              <h2 className="mt-3 text-sm font-semibold">Document indisponible</h2>
            </div>
          </div>
        )}
        {youtubeId && (
          <div id="youtube-player" className="border-t border-line p-3 md:hidden">
            <iframe
              className="aspect-video w-full rounded-lg"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
              title="Lecteur audio"
              allow="autoplay; encrypted-media"
            />
          </div>
        )}
      </section>
    </div>
  );
}
function VerseCard({
  chunk,
  number,
  fontSize,
  onPlay,
}: {
  chunk: Chunk;
  number: number;
  fontSize: number;
  onPlay: () => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <span className="text-[10px] font-semibold text-brand">Vers {number}</span>
      <p dir="rtl" style={{ fontSize }} className="mt-3 font-arabic leading-[1.9]">
        {chunk.arabic_text || "Texte arabe non disponible"}
      </p>
      {chunk.transcription && (
        <p className="mt-2 text-center text-[11px] text-muted">{chunk.transcription}</p>
      )}
      {chunk.french_translation && (
        <p className="mt-2 text-center text-xs leading-5 text-muted">
          « {chunk.french_translation} »
        </p>
      )}
      <footer className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <button
          onClick={onPlay}
          className="flex items-center gap-1.5 rounded-md bg-brand/5 px-2.5 py-1.5 text-[9px] font-semibold text-brand"
        >
          <Play size={11} />
          Écouter ce vers
        </button>
        <BookMarked size={13} className="ml-auto text-muted" />
        <Copy size={13} className="text-muted" />
        <Share2 size={13} className="text-muted" />
      </footer>
    </article>
  );
}

function ReaderAside({
  work,
  chunks,
  related,
  relatedMode,
  progress,
}: {
  work: Khassida;
  chunks: Chunk[];
  related: RelatedWork[];
  relatedMode: "related" | "discover";
  progress: number;
}) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 space-y-3">
        <SideCard title="Progression de lecture" icon={Clock3}>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-muted">
            <span>{chunks.length ? `Passage 1 / ${chunks.length}` : "Document PDF"}</span>
            <b className="text-brand">{progress}%</b>
          </div>
        </SideCard>
        <SideCard title="Poser une question IA" icon={Bot}>
          <p className="text-[9px] leading-4 text-muted">
            Interrogez ce khassida avec une réponse basée uniquement sur les sources.
          </p>
          <Link
            href="/recherche-ia"
            className="mt-3 flex h-9 items-center rounded-lg border border-line bg-canvas px-3 text-[9px] text-muted"
          >
            Ex. : Que dit ce khassida ?
            <Send size={13} className="ml-auto text-brand" />
          </Link>
        </SideCard>
        <SideCard title={relatedMode === "related" ? "Liés à ce khassaida" : "À découvrir"} icon={Sparkles}>
          <div className="divide-y divide-line">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/khassidas/${item.slug}`}
                className="flex items-center gap-2 py-2"
              >
                <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-emerald-900 font-arabic text-gold">
                  {item.cover_url ? (
                    <Image
                      src={item.cover_url}
                      alt=""
                      fill
                      unoptimized
                      sizes="36px"
                      className="bg-white object-contain p-0.5"
                    />
                  ) : (
                    "خ"
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[10px]">{item.title}</strong>
                  <small className="font-arabic text-[11px] text-muted">{item.arabic_title}</small>
                  {item.shared_themes.length > 0 && (
                    <small className="mt-0.5 block truncate text-[8px] font-semibold text-emerald-700">
                      {item.shared_themes.join(" · ")}
                    </small>
                  )}
                </span>
                <ChevronRight size={12} className="text-muted" />
              </Link>
            ))}
          </div>
        </SideCard>
      </div>
    </aside>
  );
}
function SideCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,.05)]">
      <header className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 text-[10px] font-semibold text-brand">
        <Icon size={14} />
        {title}
        <ChevronRight size={12} className="ml-auto" />
      </header>
      {children}
    </section>
  );
}
function TabContent({ tab, work, chunks }: { tab: Tab; work: Khassida; chunks: Chunk[] }) {
  if (tab === "information") {
    return (
      <section className="mt-4 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
        <header className="relative overflow-hidden border-b border-slate-100 px-6 py-7 sm:px-8">
          <span className="absolute -right-14 -top-16 size-40 rounded-full bg-brand/5" />
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand">
            <span className="grid size-8 place-items-center rounded-xl bg-brand/10">
              <Info size={15} />
            </span>
            Informations clés
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">À propos de {work.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Les repères essentiels pour identifier l’œuvre, sa provenance et les ressources
            disponibles.
          </p>
        </header>
        <dl className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          {(
            [
              [UserRound, "Auteur", "Cheikh Ahmadou Bamba"],
              [BookMarked, "Source", work.source_name || "Non renseignée"],
              [MessageSquare, "Langue", "Arabe"],
              [Tags, "Thèmes", work.themes.join(" · ") || "Non renseignés"],
              [FileText, "Document", work.pdf_url ? "PDF disponible" : "PDF indisponible"],
              [
                Headphones,
                "Récitation",
                work.audio_url ? "Audio disponible" : "Audio indisponible",
              ],
            ] as const
          ).map(([Icon, label, value]) => (
            <div
              key={label}
              className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-brand/15 hover:bg-white hover:shadow-sm"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <dt className="text-[9px] font-bold uppercase tracking-[.14em] text-muted">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-5 text-ink">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {work.description && (
          <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
            <p className="max-w-3xl text-sm leading-7 text-muted">{work.description}</p>
          </div>
        )}
      </section>
    );
  }

  const rows = ["La récitation associée est disponible dans le lecteur audio."];
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-6">
      <h2 className="text-base font-semibold capitalize">{tab}</h2>
      <div className="mt-4 divide-y divide-line">
        {rows.length ? (
          rows.map((row, i) => (
            <p key={i} className="py-3 text-xs leading-6 text-muted">
              {row}
            </p>
          ))
        ) : (
          <p className="py-8 text-center text-xs text-muted">Aucun contenu publié.</p>
        )}
      </div>
    </div>
  );
}

function AudioPanel({
  work,
  playing,
  progress,
  duration,
  error,
  disabled,
  onToggle,
  onSeek,
}: {
  work: Khassida;
  playing: boolean;
  progress: number;
  duration: number;
  error: string;
  disabled: boolean;
  onToggle: () => void;
  onSeek: (value: number) => void;
}) {
  const percent = duration ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <section className="mt-4 overflow-hidden rounded-3xl bg-[#07182c] text-white shadow-xl">
      {playing && <AudioReaction progress={progress} />}
      <div className="relative grid min-h-[430px] place-items-center overflow-hidden px-6 py-12 text-center">
        <span className="absolute -left-24 -top-24 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <span className="absolute -bottom-32 -right-20 size-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative w-full max-w-2xl">
          <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-300/15">
            <Headphones size={34} />
          </span>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.24em] text-emerald-300/70">
            Récitation audio
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{work.title}</h2>
          <p dir="rtl" className="mt-2 font-arabic text-2xl text-amber-200/90">
            {work.arabic_title}
          </p>
          <div className="mt-10 flex items-center gap-4">
            <span className="w-10 text-right text-xs tabular-nums text-white/55">
              {formatTime(progress)}
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${percent}%` }}
              />
              <input
                aria-label="Progression audio"
                type="range"
                min={0}
                max={duration || 1}
                value={progress}
                disabled={disabled}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <span className="w-10 text-xs tabular-nums text-white/55">{formatTime(duration)}</span>
          </div>
          <button
            onClick={onToggle}
            disabled={disabled}
            className="mx-auto mt-9 grid size-20 place-items-center rounded-full bg-white text-[#07182c] shadow-2xl transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={playing ? "Pause" : "Lecture"}
          >
            {playing ? (
              <Pause size={30} fill="currentColor" />
            ) : (
              <Play className="ml-1" size={32} fill="currentColor" />
            )}
          </button>
          <p className="mt-5 text-xs text-white/45">
            {disabled
              ? "Aucun audio disponible"
              : playing
                ? "Lecture en cours"
                : "Appuyez pour écouter"}
          </p>
          {error && <p className="mt-3 text-sm font-medium text-red-300">{error}</p>}
        </div>
      </div>
    </section>
  );
}

function MobileAudioPlayer({
  work,
  chunk,
  playing,
  progress,
  duration,
  error,
  onClose,
  onToggle,
  onSeek,
}: {
  work: Khassida;
  chunk?: Chunk;
  playing: boolean;
  progress: number;
  duration: number;
  error: string;
  onClose: () => void;
  onToggle: () => void;
  onSeek: (value: number) => void;
}) {
  const bars = [
    18, 24, 16, 28, 20, 34, 23, 18, 27, 38, 22, 16, 31, 25, 42, 28, 20, 35, 48, 30, 24, 39, 54, 31,
    22, 44, 65, 38, 28, 58, 80, 54, 38, 68, 92, 72, 48, 63, 82, 55, 35, 46,
  ];
  const percent = duration ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <section className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#f7f7f5] px-6 pb-8 pt-[max(24px,env(safe-area-inset-top))] text-slate-950">
      <header className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="grid size-12 place-items-center rounded-full bg-white shadow-lg"
          aria-label="Fermer"
        >
          <X size={22} />
        </button>
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
            Lecture audio
          </span>
          <p className="mt-1 max-w-[190px] truncate text-sm font-semibold">{work.title}</p>
        </div>
        <button
          className="grid size-12 place-items-center rounded-full bg-white shadow-lg"
          aria-label="Plus d’options"
        >
          <MoreHorizontal size={23} />
        </button>
      </header>
      <div className="relative mt-10 text-center">
        {playing && <AudioReaction progress={progress} compact />}
        <p dir="rtl" className="font-arabic text-3xl leading-relaxed">
          {work.arabic_title || "خَصَائِد"}
        </p>
        <p className="mt-1 text-xs text-slate-500">Récitation · Cheikh Ahmadou Bamba</p>
      </div>
      {(chunk?.arabic_text || chunk?.transcription) && (
        <div className="relative mt-6 overflow-hidden rounded-3xl bg-[#080b0a] px-5 py-6 text-center text-white shadow-2xl ring-1 ring-amber-300/15">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <span className="text-[9px] font-bold uppercase tracking-[.24em] text-amber-300/70">
            Jazbul Qulub · Passage en cours
          </span>
          {chunk.arabic_text && (
            <p
              dir="rtl"
              className="mt-3 line-clamp-3 font-arabic text-2xl leading-[1.75] text-[#e8cc62]"
            >
              {chunk.arabic_text}
            </p>
          )}
          {chunk.transcription && (
            <p className="mx-auto mt-2 line-clamp-2 max-w-lg text-xs font-semibold leading-5 text-white/70">
              {chunk.transcription}
            </p>
          )}
          <div className="mx-auto mt-4 flex h-3 max-w-56 items-center justify-center gap-0.5">
            {[3, 7, 4, 10, 5, 8, 3, 11, 6, 9, 4, 7, 3, 8, 5, 10, 4, 7, 3, 6, 4, 9, 5, 7].map(
              (height, index) => (
                <span
                  key={index}
                  className={cn("w-px rounded-full bg-[#e8cc62]", playing && "animate-pulse")}
                  style={{ height }}
                />
              ),
            )}
          </div>
        </div>
      )}
      <div className="relative mt-10 flex min-h-0 flex-1 items-center">
        <div className="absolute inset-x-0 flex h-56 items-center justify-center gap-[3px] overflow-hidden rounded-3xl bg-white px-5 shadow-sm">
          {bars.map((height, index) => (
            <span
              key={index}
              className="w-[3px] shrink-0 rounded-full bg-slate-900 transition-colors"
              style={{
                height: `${height}%`,
                opacity: (index / bars.length) * 100 <= percent ? 1 : 0.2,
              }}
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-[20%] w-0.5 bg-emerald-500"
          style={{ left: `${percent}%` }}
        >
          <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-emerald-500" />
        </div>
        <input
          aria-label="Progression audio"
          type="range"
          min={0}
          max={duration || 1}
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-x-0 z-10 h-56 w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-6 flex justify-between text-xs font-medium text-slate-400">
        <span>{formatTime(progress)}</span>
        <span>-{formatTime(Math.max(0, duration - progress))}</span>
      </div>
      <strong className="mt-4 text-center text-5xl tabular-nums tracking-tight">
        {formatTime(progress)}
      </strong>
      {error && (
        <p className="mx-auto mt-3 max-w-md text-center text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-8 flex items-center justify-center gap-10">
        <button
          onClick={() => onSeek(Math.max(0, progress - 15))}
          className="relative grid size-14 place-items-center"
          aria-label="Reculer de 15 secondes"
        >
          <RotateCcw size={36} />
          <span className="absolute text-[10px] font-bold">15</span>
        </button>
        <button
          onClick={onToggle}
          className="grid size-20 place-items-center rounded-full bg-slate-950 text-white shadow-xl"
          aria-label={playing ? "Pause" : "Lecture"}
        >
          {playing ? (
            <Pause size={32} fill="currentColor" />
          ) : (
            <Play className="ml-1" size={34} fill="currentColor" />
          )}
        </button>
        <button
          onClick={() => onSeek(Math.min(duration, progress + 15))}
          className="relative grid size-14 -scale-x-100 place-items-center"
          aria-label="Avancer de 15 secondes"
        >
          <RotateCcw size={36} />
          <span className="absolute scale-x-[-1] text-[10px] font-bold">15</span>
        </button>
      </div>
      <button
        onClick={onClose}
        className="mt-9 h-14 rounded-2xl bg-emerald-700 text-sm font-bold text-white shadow-lg"
      >
        Retour au texte
      </button>
    </section>
  );
}

function AudioReaction({ progress, compact = false }: { progress: number; compact?: boolean }) {
  const reaction = Math.floor(progress / 6) % 3;
  const labels = ["Quelle intensité !", "Une récitation profonde", "Un moment d’élévation"];

  return (
    <div className={cn("audio-reaction", compact && "audio-reaction--compact")} aria-hidden="true">
      <span className="audio-reaction__halo" />
      <span
        key={reaction}
        className="audio-reaction__sticker"
        style={{ backgroundPosition: `${reaction * 50}% center` }}
      />
      {!compact && <span className="audio-reaction__caption">{labels[reaction]}</span>}
      <span className="audio-reaction__note audio-reaction__note--one">♪</span>
      <span className="audio-reaction__note audio-reaction__note--two">♫</span>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const m = Math.floor(value / 60),
    s = Math.floor(value % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function editionLabel(edition: Pick<KhassidaEdition, "language" | "edition_kind" | "title">) {
  const languages: Record<string, string> = { ar: "Arabe", fr: "Français", wo: "Wolof", en: "Anglais" };
  const kinds = { original: "Original", translation: "Traduction", transcription: "Transcription" };
  return edition.title || `${kinds[edition.edition_kind]} · ${languages[edition.language] || edition.language}`;
}
function youtubeVideoId(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.includes("youtube.com"))
      return url.searchParams.get("v") || url.pathname.split("/embed/")[1]?.split("/")[0] || null;
  } catch {}
  return null;
}
