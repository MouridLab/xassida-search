"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ExternalLink,
  FolderHeart,
  Headphones,
  Home,
  Info,
  Library,
  Languages,
  Menu,
  MessageSquare,
  Minimize2,
  Maximize2,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Send,
  Settings,
  Sparkles,
  Tags,
  UserRound,
  X,
} from "lucide-react";
import type { Chunk, Khassida, KhassidaEdition } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  hasUsefulReadingProgress,
  readReadingProgress,
  saveReadingProgress,
  validAudioPosition,
  type ReadingProgress,
} from "@/lib/reading-progress";
import { absolutePassageUrl, resolveInitialPassage } from "@/lib/passage-links";

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
  initialPassageId,
}: {
  work: Khassida;
  chunks: Chunk[];
  editions: KhassidaEdition[];
  related: RelatedWork[];
  relatedMode: "related" | "discover";
  initialTab?: string;
  initialPassageId?: string;
}) {
  const requestedTab: Tab = ["lecture", "audio", "information"].includes(initialTab || "")
    ? (initialTab as Tab)
    : "lecture";
  const [active, setActive] = useState(0),
    [tab, setTab] = useState<Tab>(requestedTab),
    [fontSize, setFontSize] = useState(32),
    [menu, setMenu] = useState(false),
    [playing, setPlaying] = useState(false),
    [audioOpen, setAudioOpen] = useState(false),
    [audioError, setAudioError] = useState(""),
    [progress, setProgress] = useState(0),
    [duration, setDuration] = useState(0),
    [progressRestored, setProgressRestored] = useState(false),
    [hasSavedProgress, setHasSavedProgress] = useState(false),
    [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null),
    [copyStatus, setCopyStatus] = useState("Copier le lien"),
    [focusMode, setFocusMode] = useState(false),
    [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLMediaElement>(null);
  const restoredProgressRef = useRef<ReadingProgress | null>(null);
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
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);
  useEffect(() => {
    const saved = readReadingProgress(window.localStorage, work.id);
    restoredProgressRef.current = saved;
    const initialPassage = resolveInitialPassage(initialPassageId, chunks, saved);
    setActive(initialPassage.index);
    if (saved) {
      setTab(initialPassage.source === "url" ? "lecture" : saved.activeTab);
      setFontSize(saved.fontSize);
      setProgress(saved.audioPosition ?? 0);
      setHasSavedProgress(hasUsefulReadingProgress(saved));
    }
    if (initialPassage.source === "url") {
      const passageId = chunks[initialPassage.index]?.id;
      setHighlightedPassageId(passageId || null);
      window.setTimeout(() => {
        document
          .getElementById(`passage-${passageId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      window.setTimeout(() => setHighlightedPassageId(null), 3000);
    }
    setProgressRestored(true);
  }, [chunks, initialPassageId, work.id]);

  const copyActivePassageLink = useCallback(async () => {
    const currentChunk = chunks[active];
    if (!currentChunk) return;
    try {
      await navigator.clipboard.writeText(
        absolutePassageUrl(window.location.origin, work.slug, currentChunk.id),
      );
      setCopyStatus("Lien copié");
      window.setTimeout(() => setCopyStatus("Copier le lien"), 1800);
    } catch {
      setCopyStatus("Copie indisponible");
    }
  }, [active, chunks, work.slug]);

  const persistProgress = useCallback(() => {
    if (!progressRestored) return;
    const currentChunk = chunks[active];
    const saved: ReadingProgress = {
      version: 1,
      khassidaId: work.id,
      slug: work.slug,
      title: work.title,
      passageId: currentChunk?.id,
      passageIndex: active,
      page: currentChunk?.page_number || undefined,
      activeTab: tab === "audio" ? "audio" : "lecture",
      audioPosition: audioUrl && progress > 0 ? progress : undefined,
      audioUrl: audioUrl || undefined,
      fontSize,
      updatedAt: new Date().toISOString(),
    };
    if (saveReadingProgress(window.localStorage, saved)) {
      setHasSavedProgress(hasUsefulReadingProgress(saved));
    }
  }, [active, audioUrl, chunks, fontSize, progress, progressRestored, tab, work]);

  useEffect(() => {
    if (!progressRestored) return;
    const timeout = window.setTimeout(persistProgress, 700);
    return () => window.clearTimeout(timeout);
  }, [persistProgress, progressRestored]);
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
    if (youtubeId) void toggleAudio();
    else if (window.matchMedia("(max-width: 767px)").matches) {
      setTab("lecture");
      setAudioOpen(true);
    } else {
      setTab("audio");
    }
  }
  return (
    <div
      className={cn(
        "relative z-[60] -mt-[72px] min-h-screen bg-canvas pb-24 text-ink",
        audioUrl && !youtubeId && tab === "lecture" && "pb-40",
        focusMode && "reader-focus",
      )}
    >
      <ReaderTopbar onMenu={() => setMenu(true)} />
      {menu && <MobileDrawer onClose={() => setMenu(false)} />}
      <main className="mx-auto min-w-0 max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid min-h-[calc(100vh-64px-76px)] gap-10 xl:grid-cols-[minmax(0,1fr)_230px]">
          <div className="min-w-0">
            <nav
              aria-label="Fil d’Ariane"
              className="flex items-center gap-2 text-[11px] text-muted"
            >
              <Link href="/">Accueil</Link>
              <ChevronRight size={12} />
              <Link href="/khassidas">Khassaïdes</Link>
              <ChevronRight size={12} />
              <strong className="truncate text-ink">{work.title}</strong>
            </nav>
            <section className="reader-summary relative mt-8 grid grid-cols-[70px_minmax(0,1fr)] gap-5 border-y border-line py-6 sm:grid-cols-[90px_minmax(0,1fr)] sm:gap-8 sm:py-9">
              <BookCover work={work} />
              <div className="min-w-0 py-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-[-.045em] text-ink sm:text-[38px]">
                    {work.title}
                  </h1>
                  {work.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.12em] text-success">
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
              <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5">
                {" "}
                <ActionButton
                  icon={BookOpen}
                  label={hasSavedProgress ? "Reprendre" : "Lire"}
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
                  className="flex h-10 items-center justify-center gap-2 border-b border-line px-2 text-xs font-semibold text-muted"
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
                preferPassages={Boolean(
                  initialPassageId && chunks.some((item) => item.id === initialPassageId),
                )}
                highlightedPassageId={highlightedPassageId}
                copyStatus={copyStatus}
                onCopyPassage={copyActivePassageLink}
                focusMode={focusMode}
                onToggleFocus={() => setFocusMode((value) => !value)}
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
                playbackRate={playbackRate}
                onPlaybackRate={setPlaybackRate}
              />
            ) : (
              <TabContent tab={tab} work={work} chunks={chunks} />
            )}
          </div>
          <div className="reader-aside">
            <ReaderAside
              chunks={chunks}
              related={related}
              relatedMode={relatedMode}
              progress={duration ? Math.round((progress / duration) * 100) : 0}
            />
          </div>
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
            onPause={() => {
              setPlaying(false);
              persistProgress();
            }}
            onLoadedMetadata={(e) => {
              const mediaDuration = e.currentTarget.duration || 0;
              setDuration(mediaDuration);
              const restoredPosition = restoredProgressRef.current
                ? validAudioPosition(restoredProgressRef.current, audioUrl, mediaDuration)
                : null;
              if (restoredPosition !== null) {
                e.currentTarget.currentTime = restoredPosition;
                setProgress(restoredPosition);
              }
            }}
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
          playbackRate={playbackRate}
          onPlaybackRate={setPlaybackRate}
        />
      )}
      {audioUrl && !youtubeId && tab === "lecture" && !audioOpen && (
        <CompactAudioBar
          title={work.title}
          playing={playing}
          progress={progress}
          duration={duration}
          playbackRate={playbackRate}
          onToggle={toggleAudio}
          onSeek={seek}
          onPlaybackRate={setPlaybackRate}
          onExpand={() => setAudioOpen(true)}
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
      {work.arabic_title ? (
        <span className="font-arabic text-lg leading-8 sm:text-2xl">{work.arabic_title}</span>
      ) : (
        <BookOpen className="text-gold" />
      )}
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
        "flex h-11 items-center justify-center gap-2 border-b border-line px-3 text-[10px] font-semibold uppercase tracking-[.1em] text-muted transition hover:text-ink",
        active && !green && "border-brand text-brand",
        green && "border-brand text-brand",
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
  preferPassages,
  highlightedPassageId,
  copyStatus,
  onCopyPassage,
  focusMode,
  onToggleFocus,
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
  preferPassages: boolean;
  highlightedPassageId: string | null;
  copyStatus: string;
  onCopyPassage: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}) {
  const chunk = chunks[active];
  const [pdfFocus, setPdfFocus] = useState(false);
  const documents = [
    ...(work.pdf_url
      ? [
          {
            id: "primary",
            language: "ar",
            edition_kind: "original" as const,
            title: "Original arabe",
            translator: null,
            publisher: null,
            publication_year: null,
            page_count: work.page_count,
            source_name: work.source_name,
            file_name: "original.pdf",
            validation_status: "verified" as const,
            khassida_id: work.id,
            url: work.pdf_url,
          },
        ]
      : []),
    ...editions,
  ];
  const [editionId, setEditionId] = useState(preferPassages ? "" : documents[0]?.id || "");
  const selectedEdition = editionId
    ? documents.find((edition) => edition.id === editionId)
    : undefined;
  function selectPassage(index: number) {
    const next = Math.max(0, Math.min(chunks.length - 1, index));
    setActive(next);
    window.setTimeout(() => {
      document.getElementById(`passage-${chunks[next]?.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 30);
  }
  return (
    <div
      className={cn(
        "mt-8 grid gap-0",
        !selectedEdition && pages.length && "md:grid-cols-[145px_minmax(0,1fr)]",
      )}
    >
      {!selectedEdition && pages.length > 0 && (
        <aside className="hidden border-r border-line py-5 pr-5 md:block">
          <strong className="text-[10px] uppercase tracking-wider text-brand">Sommaire</strong>
          <p className="mt-4 text-[10px] font-semibold">Chapitre {chunk?.chapter_number || 1}</p>
          <div className="mt-2 space-y-0.5">
            {pages.slice(0, 24).map((item) => (
              <button
                key={item.index}
                onClick={() => selectPassage(item.index)}
                className={cn(
                  "w-full border-b border-line px-1 py-2 text-left text-[10px] text-muted",
                  active === item.index && "font-semibold text-brand",
                )}
              >
                Vers {item.verse}
              </button>
            ))}
          </div>
        </aside>
      )}
      <section className="overflow-hidden border-y border-line bg-surface">
        {(documents.length > 1 || (documents.length > 0 && chunks.length > 0)) && (
          <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <Languages size={16} className="text-brand" />
            <label className="text-[10px] font-semibold text-slate-600">Édition</label>
            <select
              value={selectedEdition?.id || ""}
              onChange={(event) => setEditionId(event.target.value)}
              className="min-w-52 border-b border-line bg-transparent px-3 py-2 text-xs font-semibold"
            >
              {chunks.length > 0 && <option value="">Passages du corpus</option>}
              {documents.map((edition) => (
                <option key={edition.id} value={edition.id}>
                  {editionLabel(edition)}
                </option>
              ))}
            </select>
            {selectedEdition?.translator && (
              <span className="text-[10px] text-slate-500">
                Traduit par {selectedEdition.translator}
              </span>
            )}
          </header>
        )}
        {!selectedEdition && chunks.length > 0 && (
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <select className="border-b border-line bg-transparent px-2 py-2 text-[10px]">
              <option>Arabe + Traduction</option>
              <option>Arabe seul</option>
              <option>Traduction seule</option>
            </select>
            <div className="flex min-h-11 items-center gap-1">
              <button
                onClick={onToggleFocus}
                className="flex h-8 items-center gap-1.5 border-b border-line px-2 text-[10px] font-semibold text-muted"
                aria-pressed={focusMode}
              >
                <Minimize2 size={13} /> {focusMode ? "Quitter" : "Lecture"}
              </button>
              <button
                onClick={() => setFontSize(previousFontLevel(fontSize))}
                className="grid size-11 place-items-center border-l border-line text-sm"
                aria-label="Réduire la taille du texte"
              >
                A−
              </button>
              <button
                onClick={() => setFontSize(32)}
                className="grid size-11 place-items-center border-l border-line text-base font-semibold"
                aria-label="Taille de texte normale"
              >
                A
              </button>
              <button
                onClick={() => setFontSize(nextFontLevel(fontSize))}
                className="grid size-11 place-items-center border-l border-line text-lg"
                aria-label="Augmenter la taille du texte"
              >
                A+
              </button>
              <button className="grid size-8 place-items-center border-l border-line">
                <BookMarked size={13} />
              </button>
              <button className="grid size-8 place-items-center border-l border-line">
                <Settings size={13} />
              </button>
            </div>
          </header>
        )}
        {selectedEdition ? (
          <div
            className={cn(
              "bg-surface",
              pdfFocus && "fixed inset-0 z-[210] flex flex-col bg-surface",
            )}
          >
            <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/95 px-3 py-2 backdrop-blur sm:px-5">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[.16em] text-gold">
                  Lecture PDF
                </span>
                <p className="max-w-[180px] truncate text-xs font-semibold text-ink sm:max-w-md">
                  {selectedEdition.title || work.title}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={selectedEdition.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-11 place-items-center border-l border-line text-muted"
                  aria-label="Ouvrir le PDF dans un nouvel onglet"
                >
                  <ExternalLink size={17} />
                </a>
                <button
                  onClick={() => setPdfFocus((value) => !value)}
                  className="flex min-h-11 items-center gap-2 border-l border-line px-3 text-[10px] font-bold uppercase tracking-[.1em] text-brand"
                  aria-pressed={pdfFocus}
                >
                  {pdfFocus ? <X size={17} /> : <Maximize2 size={17} />}
                  <span className="hidden sm:inline">{pdfFocus ? "Fermer" : "Plein écran"}</span>
                </button>
              </div>
            </header>
            <iframe
              src={`${selectedEdition.url}#toolbar=1&navpanes=0&view=FitH`}
              title={`Lire ${selectedEdition.title || work.title}`}
              className={cn(
                "w-full flex-1 bg-slate-100",
                pdfFocus
                  ? "h-[calc(100dvh-56px)]"
                  : "h-[calc(100dvh-220px)] min-h-[620px] sm:h-[calc(100vh-190px)] sm:min-h-[720px]",
              )}
            />
            {!pdfFocus && (
              <p className="border-t border-line px-4 py-3 text-[10px] leading-5 text-muted sm:hidden">
                Utilisez « Plein écran » pour maximiser le document. Le zoom et les pages sont
                contrôlés par le lecteur PDF du navigateur.
              </p>
            )}
          </div>
        ) : chunks.length ? (
          <div className="bg-surface px-4 sm:px-8 lg:px-12">
            {chunks.slice(active, active + 3).map((item, index) => (
              <VerseCard
                key={item.id}
                chunk={item}
                number={item.verse_start || active + index + 1}
                fontSize={fontSize}
                onPlay={play}
                highlighted={item.id === highlightedPassageId}
                onCopy={index === 0 ? onCopyPassage : undefined}
                copyStatus={copyStatus}
              />
            ))}
            <nav
              aria-label="Navigation entre les passages"
              className="flex items-center justify-between gap-2 border-t border-line py-5"
            >
              <button
                onClick={() => selectPassage(active - 1)}
                disabled={active === 0}
                className="min-h-11 border-b border-line px-3 text-xs font-semibold disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-[10px] text-muted">
                {active + 1} / {chunks.length}
              </span>
              <button
                onClick={() => selectPassage(active + 1)}
                disabled={active >= chunks.length - 1}
                className="min-h-11 border-b border-brand px-3 text-xs font-semibold text-brand disabled:opacity-40"
              >
                Suivant
              </button>
            </nav>
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
  highlighted,
  onCopy,
  copyStatus,
}: {
  chunk: Chunk;
  number: number;
  fontSize: number;
  onPlay: () => void;
  highlighted: boolean;
  onCopy?: () => void;
  copyStatus: string;
}) {
  return (
    <article
      id={`passage-${chunk.id}`}
      className={cn(
        "relative scroll-mt-24 border-b border-line py-12 transition duration-500 sm:py-16",
        highlighted && "bg-gold/5",
      )}
    >
      <span className="absolute left-0 top-12 text-[10px] font-bold tracking-[.18em] text-gold sm:-left-5 sm:top-16">
        {String(number).padStart(2, "0")}
      </span>
      {chunk.arabic_text && (
        <p
          dir="rtl"
          lang="ar"
          style={{
            fontSize: `clamp(${fontSize}px, calc(${fontSize}px + 0.7vw), ${fontSize + 10}px)`,
          }}
          className="mx-auto max-w-[46rem] px-7 text-center font-arabic leading-[1.95] text-ink"
        >
          {chunk.arabic_text}
        </p>
      )}
      {chunk.transcription && (
        <p className="mx-auto mt-10 max-w-[42rem] border-t border-line pt-7 text-center text-[15px] italic leading-7 text-ink/75 sm:text-base sm:leading-8">
          {chunk.transcription}
        </p>
      )}
      {chunk.french_translation && (
        <p className="mx-auto mt-7 max-w-[42rem] text-center text-[18px] leading-[1.75] text-ink/90 sm:text-[19px]">
          « {chunk.french_translation} »
        </p>
      )}
      {chunk.commentary && (
        <aside className="mx-auto mt-9 max-w-2xl border-l border-gold pl-5 text-xs leading-7 text-muted">
          <strong className="mr-2 text-ink">Commentaire</strong>
          {chunk.commentary}
        </aside>
      )}
      <footer className="mt-10 flex items-center gap-4 border-t border-line pt-4">
        <button
          onClick={onPlay}
          className="flex items-center gap-1.5 rounded-md bg-brand/5 px-2.5 py-1.5 text-[9px] font-semibold text-brand"
        >
          <Play size={11} />
          Écouter ce vers
        </button>
        <BookMarked size={13} className="ml-auto text-muted" />
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] font-semibold text-muted hover:bg-brand/5 hover:text-brand"
            title={passageReference(chunk)}
          >
            <Copy size={12} />
            {copyStatus}
          </button>
        )}
      </footer>
    </article>
  );
}

function passageReference(chunk: Chunk): string {
  return [
    chunk.chapter_number && `Chapitre ${chunk.chapter_number}`,
    chunk.verse_start && `vers ${chunk.verse_start}${chunk.verse_end ? `–${chunk.verse_end}` : ""}`,
    chunk.page_number && `page ${chunk.page_number}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function ReaderAside({
  chunks,
  related,
  relatedMode,
  progress,
}: {
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
        <SideCard
          title={relatedMode === "related" ? "Liés à ce khassaida" : "À découvrir"}
          icon={Sparkles}
        >
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
    <section className="border-t border-line py-5">
      <header className="mb-3 flex items-center gap-2 border-b border-line pb-3 text-[9px] font-bold uppercase tracking-[.12em] text-brand">
        <Icon size={14} />
        {title}
        <ChevronRight size={12} className="ml-auto" />
      </header>
      {children}
    </section>
  );
}
function TabContent({ tab, work }: { tab: Tab; work: Khassida; chunks: Chunk[] }) {
  if (tab === "information") {
    return (
      <section className="mt-8 overflow-hidden border-y border-line bg-surface">
        <header className="relative overflow-hidden border-b border-line px-6 py-9 sm:px-10">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand">
            <Info size={15} />
            Informations clés
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">À propos de {work.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Les repères essentiels pour identifier l’œuvre, sa provenance et les ressources
            disponibles.
          </p>
        </header>
        <dl className="grid px-6 sm:grid-cols-2 sm:px-10">
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
              className="flex gap-4 border-b border-line py-5 sm:odd:border-r sm:odd:pr-6 sm:even:pl-6"
            >
              <span className="grid size-8 shrink-0 place-items-center text-brand">
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
  playbackRate,
  onPlaybackRate,
}: {
  work: Khassida;
  playing: boolean;
  progress: number;
  duration: number;
  error: string;
  disabled: boolean;
  onToggle: () => void;
  onSeek: (value: number) => void;
  playbackRate: number;
  onPlaybackRate: (value: number) => void;
}) {
  const percent = duration ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <section className="mt-8 overflow-hidden border-y border-line bg-surface text-ink">
      {playing && <AudioReaction progress={progress} />}
      <div className="relative grid min-h-[430px] place-items-center overflow-hidden px-6 py-14 text-center">
        <div className="relative w-full max-w-2xl">
          <span className="mx-auto grid size-16 place-items-center border border-gold text-brand">
            <Headphones size={34} />
          </span>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.24em] text-gold">
            Récitation audio
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{work.title}</h2>
          <p dir="rtl" className="mt-2 font-arabic text-2xl text-brand">
            {work.arabic_title}
          </p>
          <div className="mt-10 flex items-center gap-4">
            <span className="w-10 text-right text-xs tabular-nums text-muted">
              {formatTime(progress)}
            </span>
            <div className="relative h-px flex-1 bg-line">
              <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
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
            <span className="w-10 text-xs tabular-nums text-muted">{formatTime(duration)}</span>
          </div>
          <button
            onClick={onToggle}
            disabled={disabled}
            className="mx-auto mt-9 grid size-16 place-items-center rounded-full border border-brand text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={playing ? "Pause" : "Lecture"}
          >
            {playing ? (
              <Pause size={30} fill="currentColor" />
            ) : (
              <Play className="ml-1" size={32} fill="currentColor" />
            )}
          </button>
          <AudioTransport
            progress={progress}
            duration={duration}
            playbackRate={playbackRate}
            onSeek={onSeek}
            onPlaybackRate={onPlaybackRate}
          />
          <p className="mt-5 text-xs text-muted">
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
  playbackRate,
  onPlaybackRate,
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
  playbackRate: number;
  onPlaybackRate: (value: number) => void;
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
          {work.arabic_title || work.title}
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
      <div className="mt-8 flex items-center justify-center gap-8">
        <button
          onClick={() => onSeek(Math.max(0, progress - 10))}
          className="relative grid size-14 place-items-center"
          aria-label="Reculer de 10 secondes"
        >
          <RotateCcw size={36} />
          <span className="absolute text-[10px] font-bold">10</span>
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
          onClick={() => onSeek(Math.min(duration, progress + 10))}
          className="relative grid size-14 -scale-x-100 place-items-center"
          aria-label="Avancer de 10 secondes"
        >
          <RotateCcw size={36} />
          <span className="absolute scale-x-[-1] text-[10px] font-bold">10</span>
        </button>
      </div>
      <label className="mx-auto mt-6 flex min-h-11 items-center gap-3 text-xs font-semibold text-muted">
        Vitesse
        <select
          value={playbackRate}
          onChange={(event) => onPlaybackRate(Number(event.target.value))}
          className="min-h-11 border-b border-line bg-transparent px-2 text-ink"
        >
          <option value={0.75}>0.75×</option>
          <option value={1}>1×</option>
          <option value={1.25}>1.25×</option>
          <option value={1.5}>1.5×</option>
        </select>
      </label>
      <button
        onClick={onClose}
        className="mt-9 h-14 rounded-2xl bg-emerald-700 text-sm font-bold text-white shadow-lg"
      >
        Retour au texte
      </button>
    </section>
  );
}

function CompactAudioBar({
  title,
  playing,
  progress,
  duration,
  playbackRate,
  onToggle,
  onSeek,
  onPlaybackRate,
  onExpand,
}: {
  title: string;
  playing: boolean;
  progress: number;
  duration: number;
  playbackRate: number;
  onToggle: () => void;
  onSeek: (value: number) => void;
  onPlaybackRate: (value: number) => void;
  onExpand: () => void;
}) {
  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(41_39_31/.08)] backdrop-blur-xl"
      aria-label="Lecteur audio compact"
    >
      <div className="mx-auto grid min-h-[72px] max-w-[1050px] grid-cols-[48px_minmax(0,1fr)_44px] items-center gap-3 px-3 sm:grid-cols-[48px_180px_minmax(180px,1fr)_auto_auto] sm:px-5">
        <button
          onClick={onToggle}
          className="grid size-12 place-items-center rounded-full border border-brand text-brand"
          aria-label={playing ? "Pause" : "Lecture"}
        >
          {playing ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play className="ml-0.5" size={21} fill="currentColor" />
          )}
        </button>
        <div className="min-w-0">
          <strong className="block truncate text-xs text-ink">{title}</strong>
          <span className="text-[10px] tabular-nums text-muted">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>
        <div className="relative col-span-3 h-11 sm:col-span-1">
          <div className="absolute inset-x-0 top-1/2 h-px bg-line">
            <span
              className="block h-full bg-brand"
              style={{ width: `${duration ? Math.min(100, (progress / duration) * 100) : 0}%` }}
            />
          </div>
          <input
            aria-label="Progression audio"
            type="range"
            min={0}
            max={duration || 1}
            value={progress}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </div>
        <label className="hidden min-h-11 items-center sm:flex">
          <span className="sr-only">Vitesse audio</span>
          <select
            value={playbackRate}
            onChange={(event) => onPlaybackRate(Number(event.target.value))}
            className="min-h-11 bg-transparent px-2 text-xs font-semibold text-muted"
          >
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
          </select>
        </label>
        <button
          onClick={onExpand}
          className="grid size-11 place-items-center text-muted"
          aria-label="Agrandir le lecteur audio"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </aside>
  );
}

function AudioTransport({
  progress,
  duration,
  playbackRate,
  onSeek,
  onPlaybackRate,
}: {
  progress: number;
  duration: number;
  playbackRate: number;
  onSeek: (value: number) => void;
  onPlaybackRate: (value: number) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={() => onSeek(Math.max(0, progress - 10))}
        className="min-h-11 px-3 text-xs font-semibold text-muted"
        aria-label="Reculer de 10 secondes"
      >
        −10 s
      </button>
      <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
        Vitesse
        <select
          value={playbackRate}
          onChange={(event) => onPlaybackRate(Number(event.target.value))}
          className="min-h-11 border-b border-line bg-transparent px-2 text-ink"
        >
          <option value={0.75}>0.75×</option>
          <option value={1}>1×</option>
          <option value={1.25}>1.25×</option>
          <option value={1.5}>1.5×</option>
        </select>
      </label>
      <button
        onClick={() => onSeek(Math.min(duration, progress + 10))}
        className="min-h-11 px-3 text-xs font-semibold text-muted"
        aria-label="Avancer de 10 secondes"
      >
        +10 s
      </button>
    </div>
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

const fontLevels = [28, 32, 38, 44] as const;
function previousFontLevel(value: number) {
  return [...fontLevels].reverse().find((level) => level < value) ?? fontLevels[0];
}
function nextFontLevel(value: number) {
  return fontLevels.find((level) => level > value) ?? fontLevels[fontLevels.length - 1];
}
function editionLabel(edition: Pick<KhassidaEdition, "language" | "edition_kind" | "title">) {
  const languages: Record<string, string> = {
    ar: "Arabe",
    fr: "Français",
    wo: "Wolof",
    en: "Anglais",
  };
  const kinds = { original: "Original", translation: "Traduction", transcription: "Transcription" };
  return (
    edition.title ||
    `${kinds[edition.edition_kind]} · ${languages[edition.language] || edition.language}`
  );
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
