"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Download,
  FileText,
  FolderHeart,
  Headphones,
  Heart,
  History,
  Home,
  Info,
  Library,
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
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Tags,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import type { Chunk, Khassida } from "@/types/database";
import { cn } from "@/lib/utils";

type Tab =
  | "lecture"
  | "audio"
  | "information"
  | "chapitres"
  | "commentaires"
  | "sources";
const mainLinks = [
  [Home, "Accueil", "/"],
  [FileText, "Khassaïdes", "/khassidas"],
  [Library, "Bibliothèque", "/bibliotheque"],
  [Tags, "Thèmes", "/themes"],
  [FolderHeart, "Collections", "/collections"],
  [Bot, "Recherche IA", "/recherche-ia"],
  [CircleHelp, "À propos", "/a-propos"],
] as const;
const personalLinks = [
  [Clock3, "Continuer la lecture"],
  [Heart, "Favoris"],
  [MessageSquare, "Notes"],
  [History, "Historique"],
  [Download, "Téléchargements"],
] as const;

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
    [tab, setTab] = useState<Tab>("lecture"),
    [fontSize, setFontSize] = useState(29),
    [menu, setMenu] = useState(false),
    [playing, setPlaying] = useState(false),
    [audioOpen, setAudioOpen] = useState(false),
    [audioError, setAudioError] = useState(""),
    [progress, setProgress] = useState(0),
    [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunk = chunks[active];
  const audioUrl = chunk?.audio_url || work.audio_url;
  const youtubeId = youtubeVideoId(audioUrl);
  const pdfPages = Math.max(0, ...chunks.map((c) => c.page_number || 0));
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
  const tabs: [Tab, string][] = [
    ["lecture", "Lecture"],
    ["audio", "Audio"],
    ["information", "Informations"],
    ["chapitres", "Chapitres"],
    ["commentaires", "Commentaires"],
    ["sources", "Sources"],
  ];
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
      try { await el.play(); }
      catch { setAudioError("Ce fichier audio est indisponible ou son format n’est pas pris en charge."); }
    }
    else el.pause();
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
    else setAudioOpen(true);
  }
  return (
    <div className="relative z-[60] -mt-[72px] min-h-screen bg-canvas pb-24 text-ink">
      <ReaderTopbar onMenu={() => setMenu(true)} />
      {menu && <MobileDrawer onClose={() => setMenu(false)} />}
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <ReaderSidebar />
        <main className="min-w-0 border-l border-line bg-surface">
          <div className="grid min-h-[calc(100vh-64px-76px)] xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 px-4 py-5 sm:px-7 lg:px-9">
              <nav className="flex items-center gap-2 text-[11px] text-muted">
                <Link href="/">Accueil</Link>
                <ChevronRight size={12} />
                <Link href="/khassidas">Khassaïdes</Link>
                <ChevronRight size={12} />
                <strong className="truncate text-ink">{work.title}</strong>
              </nav>
              <section className="mt-6 grid grid-cols-[92px_minmax(0,1fr)] gap-4 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-7">
                <BookCover work={work} />
                <div className="min-w-0 py-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-[-.035em] sm:text-3xl">
                      {work.title}
                    </h1>
                    {work.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                        <CheckCircle2 size={12} />
                        Vérifié
                      </span>
                    )}
                  </div>
                  <p
                    dir="rtl"
                    className="mt-1 w-fit font-arabic text-2xl sm:text-3xl"
                  >
                    {work.arabic_title}
                  </p>
                  <p className="mt-3 line-clamp-2 max-w-2xl text-xs leading-5 text-muted sm:line-clamp-none sm:text-sm sm:leading-6">
                    {work.description ||
                      "Œuvre de Cheikh Ahmadou Bamba disponible dans la bibliothèque Xassida Search."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
                    {chunks.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={13} />
                        <b className="text-ink">{chunks.length}</b> passages
                      </span>
                    )}
                    {pdfPages > 0 && (
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} />
                        <b className="text-ink">{pdfPages}</b> pages
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
                <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex">
                  {" "}
                  <ActionButton
                    icon={BookOpen}
                    label="Lire"
                    active
                    onClick={() => setTab("lecture")}
                  />
                  <ActionButton
                    icon={Headphones}
                    label="Écouter"
                    green
                    onClick={openAudio}
                  />
                  {work.pdf_url && (
                    <a
                      href={work.pdf_url}
                      target="_blank"
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-5 text-xs font-semibold"
                    >
                      <FileText size={15} />
                      PDF
                    </a>
                  )}
                  <Link
                    href="/recherche-ia"
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-5 text-xs font-semibold"
                  >
                    <Bot size={15} />
                    Poser une question IA
                  </Link>
                </div>
              </section>
              <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
                {tabs.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={cn(
                      "relative whitespace-nowrap px-3 py-3 text-[11px] font-semibold text-muted",
                      tab === id &&
                        "text-brand after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-brand",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {tab === "lecture" || tab === "audio" ? (
                <ReaderContent
                  work={work}
                  chunks={chunks}
                  pages={pages}
                  active={active}
                  setActive={setActive}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  play={toggleAudio}
                  youtubeId={youtubeId}
                />
              ) : (
                <TabContent tab={tab} work={work} chunks={chunks} />
              )}
            </div>
            <ReaderAside
              work={work}
              chunks={chunks}
              related={related}
              progress={duration ? Math.round((progress / duration) * 100) : 0}
            />
          </div>
        </main>
      </div>
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
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
            onError={() => setAudioError("Impossible de charger ce fichier audio. Vérifiez le stockage et son format.")}
          />
        )
      )}
      <BottomPlayer
        work={work}
        playing={playing}
        progress={progress}
        duration={duration}
        onToggle={toggleAudio}
        onSeek={seek}
        disabled={!audioUrl}
      />
      {audioOpen&&audioUrl&&!youtubeId&&<MobileAudioPlayer work={work} playing={playing} progress={progress} duration={duration} error={audioError} onClose={()=>setAudioOpen(false)} onToggle={toggleAudio} onSeek={seek}/>}
    </div>
  );
}

function ReaderTopbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center border-b border-line bg-surface/95 px-4 backdrop-blur-xl lg:px-6">
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
function ReaderSidebar() {
  return (
    <aside className="hidden bg-surface lg:block">
      <div className="sticky top-16 flex h-[calc(100vh-64px)] flex-col p-4">
        <nav className="space-y-0.5">
          {mainLinks.map(([Icon, label, href]) => (
            <Link
              href={href}
              key={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[11px] font-medium text-muted hover:bg-brand/5 hover:text-brand",
                href === "/khassidas" && "bg-brand/5 text-brand",
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="my-4 border-t border-line" />
        <p className="px-3 text-[9px] font-semibold uppercase tracking-wider text-muted">
          Ma bibliothèque
        </p>
        <nav className="mt-2 space-y-0.5">
          {personalLinks.map(([Icon, label]) => (
            <button
              key={label}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-muted hover:bg-brand/5"
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-brand/15 bg-brand/5 p-3">
          <Download size={17} className="text-brand" />
          <strong className="mt-2 block text-[11px]">Accédez partout</strong>
          <p className="mt-1 text-[9px] leading-4 text-muted">
            L’application mobile Xassida Search arrive bientôt.
          </p>
        </div>
      </div>
    </aside>
  );
}
function MobileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/30 lg:hidden"
      onClick={onClose}
    >
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
  return (
    <div className="relative grid h-36 w-[92px] place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-950 to-emerald-800 p-2 text-center text-gold shadow-[0_14px_30px_rgba(6,78,59,.24)] sm:h-48 sm:w-[130px]">
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
        "flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-6 text-xs font-semibold",
        active && "border-brand bg-brand text-white",
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
  pages: { index: number; page: number; chapter: number; verse: number }[];
  active: number;
  setActive: (v: number) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  play: () => void;
  youtubeId: string | null;
}) {
  const chunk = chunks[active];
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
      <aside className="hidden rounded-xl border border-line bg-canvas/50 p-3 md:block">
        <strong className="text-[10px] uppercase tracking-wider text-brand">
          Sommaire
        </strong>
        <p className="mt-4 text-[10px] font-semibold">
          Chapitre {chunk?.chapter_number || 1}
        </p>
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
          {!pages.length && (
            <p className="py-3 text-[10px] leading-4 text-muted">
              Document scanné, sans découpage en vers.
            </p>
          )}
        </div>
      </aside>
      <section className="overflow-hidden rounded-xl border border-line bg-surface">
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
        {chunks.length ? (
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
        ) : work.pdf_url ? (
          <iframe
            src={`${work.pdf_url}#toolbar=1&navpanes=0&view=FitH`}
            title={`Lire ${work.title}`}
            className="h-[65vh] min-h-[560px] w-full bg-slate-100"
          />
        ) : (
          <div className="grid min-h-[500px] place-items-center text-center">
            <div>
              <BookOpen className="mx-auto text-brand" />
              <h2 className="mt-3 text-sm font-semibold">
                Document indisponible
              </h2>
            </div>
          </div>
        )}
        {youtubeId && (
          <div
            id="youtube-player"
            className="border-t border-line p-3 md:hidden"
          >
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
      <span className="text-[10px] font-semibold text-brand">
        Vers {number}
      </span>
      <p
        dir="rtl"
        style={{ fontSize }}
        className="mt-3 font-arabic leading-[1.9]"
      >
        {chunk.arabic_text || "Texte arabe non disponible"}
      </p>
      {chunk.transcription && (
        <p className="mt-2 text-center text-[11px] text-muted">
          {chunk.transcription}
        </p>
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
  progress,
}: {
  work: Khassida;
  chunks: Chunk[];
  related: Pick<Khassida, "slug" | "title" | "arabic_title">[];
  progress: number;
}) {
  return (
    <aside className="hidden border-l border-line bg-canvas/40 p-5 xl:block">
      <div className="sticky top-20 space-y-3">
        <SideCard title="Informations clés" icon={Info}>
          <dl className="grid grid-cols-[95px_1fr] gap-y-2 text-[9px]">
            <dt className="font-semibold">Auteur</dt>
            <dd className="text-muted">Cheikh Ahmadou Bamba</dd>
            <dt className="font-semibold">Source</dt>
            <dd className="text-muted">
              {work.source_name || "Non renseignée"}
            </dd>
            <dt className="font-semibold">Langue</dt>
            <dd className="text-muted">Arabe</dd>
            <dt className="font-semibold">Thèmes</dt>
            <dd className="flex flex-wrap gap-1">
              {work.themes.slice(0, 4).map((t) => (
                <span className="rounded bg-canvas px-1.5 py-1" key={t}>
                  {t}
                </span>
              ))}
            </dd>
          </dl>
        </SideCard>
        <SideCard title="Progression de lecture" icon={Clock3}>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-brand"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-muted">
            <span>
              {chunks.length ? `Passage 1 / ${chunks.length}` : "Document PDF"}
            </span>
            <b className="text-brand">{progress}%</b>
          </div>
        </SideCard>
        <SideCard title="Poser une question IA" icon={Bot}>
          <p className="text-[9px] leading-4 text-muted">
            Interrogez ce khassida avec une réponse basée uniquement sur les
            sources.
          </p>
          <Link
            href="/recherche-ia"
            className="mt-3 flex h-9 items-center rounded-lg border border-line bg-canvas px-3 text-[9px] text-muted"
          >
            Ex. : Que dit ce khassida ?
            <Send size={13} className="ml-auto text-brand" />
          </Link>
        </SideCard>
        <SideCard title="Liés à ce khassida" icon={Sparkles}>
          <div className="divide-y divide-line">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/khassidas/${item.slug}`}
                className="flex items-center gap-2 py-2"
              >
                <span className="grid size-8 place-items-center rounded bg-emerald-900 font-arabic text-gold">
                  خ
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[10px]">
                    {item.title}
                  </strong>
                  <small className="font-arabic text-[11px] text-muted">
                    {item.arabic_title}
                  </small>
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
    <section className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
      <header className="mb-3 flex items-center gap-2 border-b border-line pb-2.5 text-[10px] font-semibold text-brand">
        <Icon size={14} />
        {title}
        <ChevronRight size={12} className="ml-auto" />
      </header>
      {children}
    </section>
  );
}
function TabContent({
  tab,
  work,
  chunks,
}: {
  tab: Tab;
  work: Khassida;
  chunks: Chunk[];
}) {
  const rows =
    tab === "information"
      ? [
          `Auteur : Cheikh Ahmadou Bamba`,
          `Source : ${work.source_name || "Non renseignée"}`,
          `Thèmes : ${work.themes.join(", ") || "Non renseignés"}`,
        ]
      : tab === "chapitres"
        ? [...new Set(chunks.map((c) => `Chapitre ${c.chapter_number || 1}`))]
        : tab === "commentaires"
          ? (chunks.map((c) => c.commentary).filter(Boolean) as string[])
          : tab === "sources"
            ? [
                work.source_name || "Source non renseignée",
                work.pdf_url ? "PDF original disponible" : "PDF indisponible",
              ]
            : ["La récitation associée est disponible dans le lecteur audio."];
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
          <p className="py-8 text-center text-xs text-muted">
            Aucun contenu publié.
          </p>
        )}
      </div>
    </div>
  );
}

function MobileAudioPlayer({work,playing,progress,duration,error,onClose,onToggle,onSeek}:{work:Khassida;playing:boolean;progress:number;duration:number;error:string;onClose:()=>void;onToggle:()=>void;onSeek:(value:number)=>void}){
  const bars=[18,24,16,28,20,34,23,18,27,38,22,16,31,25,42,28,20,35,48,30,24,39,54,31,22,44,65,38,28,58,80,54,38,68,92,72,48,63,82,55,35,46];
  const percent=duration?Math.min(100,(progress/duration)*100):0;
  return <section className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#f7f7f5] px-6 pb-8 pt-[max(24px,env(safe-area-inset-top))] text-slate-950">
    <header className="flex items-center justify-between"><button onClick={onClose} className="grid size-12 place-items-center rounded-full bg-white shadow-lg" aria-label="Fermer"><X size={22}/></button><div className="text-center"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Lecture audio</span><p className="mt-1 max-w-[190px] truncate text-sm font-semibold">{work.title}</p></div><button className="grid size-12 place-items-center rounded-full bg-white shadow-lg" aria-label="Plus d’options"><MoreHorizontal size={23}/></button></header>
    <div className="mt-10 text-center"><p dir="rtl" className="font-arabic text-3xl leading-relaxed">{work.arabic_title||"خَصَائِد"}</p><p className="mt-1 text-xs text-slate-500">Récitation · Cheikh Ahmadou Bamba</p></div>
    <div className="relative mt-10 flex min-h-0 flex-1 items-center"><div className="absolute inset-x-0 flex h-56 items-center justify-center gap-[3px] overflow-hidden rounded-3xl bg-white px-5 shadow-sm">{bars.map((height,index)=><span key={index} className="w-[3px] shrink-0 rounded-full bg-slate-900 transition-colors" style={{height:`${height}%`,opacity:index/bars.length*100<=percent?1:.2}}/>)}</div><div className="pointer-events-none absolute inset-y-[20%] w-0.5 bg-emerald-500" style={{left:`${percent}%`}}><span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-emerald-500"/></div><input aria-label="Progression audio" type="range" min={0} max={duration||1} value={progress} onChange={e=>onSeek(Number(e.target.value))} className="absolute inset-x-0 z-10 h-56 w-full cursor-pointer opacity-0"/></div>
    <div className="mt-6 flex justify-between text-xs font-medium text-slate-400"><span>{formatTime(progress)}</span><span>-{formatTime(Math.max(0,duration-progress))}</span></div>
    <strong className="mt-4 text-center text-5xl tabular-nums tracking-tight">{formatTime(progress)}</strong>{error&&<p className="mx-auto mt-3 max-w-md text-center text-sm font-medium text-red-600">{error}</p>}
    <div className="mt-8 flex items-center justify-center gap-10"><button onClick={()=>onSeek(Math.max(0,progress-15))} className="relative grid size-14 place-items-center" aria-label="Reculer de 15 secondes"><RotateCcw size={36}/><span className="absolute text-[10px] font-bold">15</span></button><button onClick={onToggle} className="grid size-20 place-items-center rounded-full bg-slate-950 text-white shadow-xl" aria-label={playing?"Pause":"Lecture"}>{playing?<Pause size={32} fill="currentColor"/>:<Play className="ml-1" size={34} fill="currentColor"/>}</button><button onClick={()=>onSeek(Math.min(duration,progress+15))} className="relative grid size-14 -scale-x-100 place-items-center" aria-label="Avancer de 15 secondes"><RotateCcw size={36}/><span className="absolute scale-x-[-1] text-[10px] font-bold">15</span></button></div>
    <button onClick={onClose} className="mt-9 h-14 rounded-2xl bg-emerald-700 text-sm font-bold text-white shadow-lg">Retour au texte</button>
  </section>
}

function BottomPlayer({
  work,
  playing,
  progress,
  duration,
  onToggle,
  onSeek,
  disabled,
}: {
  work: Khassida;
  playing: boolean;
  progress: number;
  duration: number;
  onToggle: () => void;
  onSeek: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] h-[76px] border-t border-white/10 bg-[#07182c] text-white shadow-2xl">
      <div className="mx-auto flex h-full max-w-[1500px] items-center gap-4 px-4 sm:px-6">
        <span className="hidden size-11 place-items-center rounded bg-emerald-900 font-arabic text-gold sm:grid">
          خ
        </span>
        <div className="min-w-0 sm:w-44">
          <strong className="block truncate text-[11px]">{work.title}</strong>
          <small className="text-[9px] text-slate-400">
            {disabled ? "Audio indisponible" : "Récitation"}
          </small>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button className="hidden size-8 place-items-center text-slate-400 sm:grid">
            <Shuffle size={14} />
          </button>
          <button className="hidden size-8 place-items-center sm:grid">
            <SkipBack size={16} />
          </button>
          <button
            onClick={onToggle}
            disabled={disabled}
            className="grid size-12 place-items-center rounded-full bg-brand shadow-[0_0_24px_rgba(29,78,216,.55)] disabled:opacity-40"
          >
            {playing ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
          </button>
          <button className="hidden size-8 place-items-center sm:grid">
            <SkipForward size={16} />
          </button>
          <button className="hidden size-8 place-items-center text-slate-400 sm:grid">
            <RotateCcw size={14} />
          </button>
        </div>
        <span className="ml-2 hidden text-[9px] text-slate-400 md:block">
          {formatTime(progress)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="hidden min-w-0 flex-1 accent-brand md:block"
        />
        <span className="hidden text-[9px] text-slate-400 md:block">
          {formatTime(duration)}
        </span>
        <Volume2 size={15} className="ml-auto hidden text-slate-300 lg:block" />
        <MoreHorizontal size={18} className="text-slate-300" />
      </div>
    </div>
  );
}
function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const m = Math.floor(value / 60),
    s = Math.floor(value % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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
