"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { askSourceHref } from "@/lib/passage-links";

type CorpusWork = {
  id: string;
  title: string;
  slug: string;
  pageCount?: number | null;
  hasAudio?: boolean;
  kind?: "khassida" | "document";
};

type Source = {
  id: string;
  chunk_id?: string;
  title?: string;
  slug?: string;
  quote?: string;
  reference?: string;
  arabic_text?: string | null;
  transcription?: string | null;
  french_translation?: string | null;
};

type Message = { question: string; answer: string; sources: Source[] };

const suggestions = [
  "Que disent les textes sur la patience ?",
  "Quels passages parlent de Touba ?",
  "Parler de la gratitude",
];

export function AskInterface({ works = [] }: { works?: CorpusWork[] }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  const visibleWorks = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase("fr");
    return works
      .filter((work) => !query || work.title.toLocaleLowerCase("fr").includes(query))
      .slice(0, 12);
  }, [filter, works]);

  useEffect(() => {
    if (!selectedSource) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedSource(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selectedSource]);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (question.trim().length < 5 || loading) return;
    setLoading(true);
    setError("");
    const current = question;
    setQuestion("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: current }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const next = { question: current, answer: body.answer, sources: body.sources || [] };
      setMessages((value) => [...value, next]);
      setSelectedSource(next.sources[0] || null);
    } catch (reason) {
      setQuestion(current);
      setError(reason instanceof Error ? reason.message : "Réponse indisponible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="border-t border-line bg-surface">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1600px] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(500px,1fr)_400px]">
        <CorpusPanel
          works={visibleWorks}
          total={works.length}
          filter={filter}
          onFilter={setFilter}
        />

        <section className="flex min-w-0 flex-col border-line lg:border-l xl:border-r">
          <header className="border-b border-line px-5 py-6 sm:px-8">
            <span className="folio-label">Assistant documentaire</span>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-ink">
              Questionner le corpus
            </h1>
          </header>

          <div className="flex-1 space-y-12 px-5 py-8 sm:px-8 lg:px-10">
            {!messages.length && (
              <div className="mx-auto max-w-2xl py-10 lg:py-20">
                <Sparkles size={24} className="text-gold" />
                <h2 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Posez une question aux œuvres et remontez jusqu’aux passages.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
                  L’assistant répond à partir du corpus validé. Chaque réponse conserve ses sources
                  afin que vous puissiez les lire dans leur contexte.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <motion.article
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                key={`${message.question}-${index}`}
                className="mx-auto max-w-3xl"
              >
                <div className="ml-auto max-w-[88%] border border-line bg-paper px-5 py-4 text-sm leading-6 text-ink">
                  {message.question}
                </div>
                <div className="mt-8 flex items-center gap-3 border-b border-line pb-4">
                  <Sparkles size={18} className="text-gold" />
                  <h2 className="font-serif text-lg font-semibold text-ink">Réponse</h2>
                </div>
                <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-ink">
                  {message.answer}
                </p>

                {message.sources.length > 0 && (
                  <ol className="mt-7 space-y-5">
                    {message.sources.map((source, sourceIndex) => (
                      <li key={source.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedSource(source)}
                          className="group grid w-full grid-cols-[28px_minmax(0,1fr)] gap-3 text-left"
                        >
                          <span className="grid size-6 place-items-center bg-brand text-xs font-semibold text-white">
                            {sourceIndex + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink group-hover:text-brand">
                              {source.title || "Passage du corpus"}
                              {source.reference && (
                                <span className="font-normal text-muted">
                                  {" "}
                                  · {source.reference}
                                </span>
                              )}
                            </span>
                            {source.arabic_text && (
                              <span
                                dir="rtl"
                                lang="ar"
                                className="mt-3 block border border-line bg-paper px-5 py-4 font-arabic text-xl leading-loose text-ink"
                              >
                                {source.arabic_text}
                              </span>
                            )}
                            {(source.french_translation || source.quote) && (
                              <span className="block border-x border-b border-line bg-paper px-5 pb-4 text-sm leading-6 text-ink/80">
                                {source.french_translation || source.quote}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </motion.article>
            ))}

            {loading && (
              <div className="mx-auto flex max-w-3xl items-center gap-3 text-sm text-muted">
                <span className="size-2 animate-pulse rounded-full bg-brand" />
                Recherche dans les sources…
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
            <form onSubmit={ask} className="mx-auto max-w-3xl">
              <div className="flex items-end border border-line bg-paper focus-within:border-brand">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={2}
                  className="max-h-32 min-h-14 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-6 text-ink outline-none"
                  placeholder="Posez une question sur les khassaïdes…"
                />
                <button
                  disabled={loading || question.trim().length < 5}
                  className="m-2 grid size-11 shrink-0 place-items-center bg-brand text-white transition hover:bg-brand/90 disabled:opacity-40"
                  aria-label="Envoyer"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setQuestion(item)}
                    className="shrink-0 border border-line px-3 py-2 text-[11px] text-muted transition hover:border-gold hover:text-ink"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] text-muted">
                L’assistant peut se tromper. Vérifiez toujours les passages cités.
              </p>
            </form>
          </div>
        </section>

        <SourcePanel source={selectedSource} onClose={() => setSelectedSource(null)} />
      </div>
    </main>
  );
}

function CorpusPanel({
  works,
  total,
  filter,
  onFilter,
}: {
  works: CorpusWork[];
  total: number;
  filter: string;
  onFilter: (value: string) => void;
}) {
  return (
    <aside className="hidden max-h-[calc(100vh-72px)] overflow-y-auto px-5 py-8 lg:block">
      <h2 className="font-serif text-lg font-semibold text-ink">Corpus interrogé</h2>
      <p className="mt-2 text-xs text-brand">{total} œuvres disponibles</p>
      <label className="mt-5 flex items-center gap-2 border border-line px-3 py-2.5 text-muted">
        <Search size={15} />
        <span className="sr-only">Filtrer les œuvres</span>
        <input
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          placeholder="Filtrer les œuvres…"
          className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none"
        />
      </label>
      <p className="folio-label mt-8">Khassaïdes</p>
      <div className="mt-3 border border-line">
        {works.map((work) => (
          <Link
            href={`/khassidas/${encodeURIComponent(work.slug)}`}
            key={work.id}
            className="group flex gap-3 border-b border-line px-3 py-4 last:border-b-0 hover:bg-paper"
          >
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center bg-brand text-white">
              <Check size={13} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-sm font-semibold text-ink group-hover:text-brand">
                {work.title}
              </span>
              <span className="mt-1 block text-[11px] text-muted">
                {work.pageCount ? `${work.pageCount} pages` : "Œuvre du corpus"}
                {work.hasAudio ? " · Audio" : ""}
              </span>
            </span>
          </Link>
        ))}
        {!works.length && <p className="px-3 py-5 text-xs text-muted">Aucune œuvre trouvée.</p>}
      </div>
      <div className="mt-8 border border-line p-4">
        <p className="flex items-center gap-2 font-serif text-sm font-semibold text-ink">
          <Sparkles size={15} className="text-gold" /> À propos
        </p>
        <p className="mt-3 text-xs leading-6 text-muted">
          Les réponses sont générées à partir des passages validés. Consultez toujours les sources.
        </p>
      </div>
    </aside>
  );
}

function SourcePanel({ source, onClose }: { source: Source | null; onClose: () => void }) {
  async function copy(value: string) {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
  }

  return (
    <aside
      className={`fixed inset-0 z-50 overflow-y-auto bg-surface px-5 py-7 xl:static xl:z-auto xl:block xl:max-h-[calc(100vh-72px)] xl:px-7 ${source ? "block" : "hidden"}`}
      aria-label="Source sélectionnée"
    >
      {source && (
        <>
          <div className="flex items-center justify-between border-b border-line pb-5">
            <h2 className="font-serif text-lg font-semibold text-ink">Source sélectionnée</h2>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-xs text-muted hover:text-ink"
            >
              Fermer <X size={17} />
            </button>
          </div>
          <div className="py-7">
            <div className="flex gap-3">
              <FileText size={25} className="shrink-0 text-gold" />
              <div>
                <h3 className="font-serif text-lg font-semibold text-ink">
                  {source.title || "Passage du corpus"}
                </h3>
                <p className="mt-1 text-sm text-muted">{source.reference}</p>
              </div>
            </div>
            <Link
              href={askSourceHref(source)}
              className="mt-6 inline-flex items-center gap-2 border border-gold/50 px-4 py-3 text-xs font-semibold text-brand hover:border-brand"
            >
              Ouvrir dans le lecteur <ExternalLink size={14} />
            </Link>
          </div>

          {source.arabic_text && (
            <SourceSection title="Texte arabe">
              <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2.2] text-ink">
                {source.arabic_text}
              </p>
            </SourceSection>
          )}
          {source.transcription && (
            <SourceSection title="Transcription" onCopy={() => copy(source.transcription || "")}>
              <p className="text-sm leading-7 text-ink">{source.transcription}</p>
            </SourceSection>
          )}
          {(source.french_translation || source.quote) && (
            <SourceSection
              title="Traduction"
              onCopy={() => copy(source.french_translation || source.quote || "")}
            >
              <p className="font-serif text-base leading-8 text-ink">
                {source.french_translation || source.quote}
              </p>
            </SourceSection>
          )}
          <Link
            href={askSourceHref(source)}
            className="mt-7 inline-flex items-center gap-2 border border-brand/30 px-4 py-3 text-sm font-semibold text-brand hover:bg-paper"
          >
            <BookOpen size={17} /> Voir le passage complet
          </Link>
        </>
      )}
    </aside>
  );
}

function SourceSection({
  title,
  onCopy,
  children,
}: {
  title: string;
  onCopy?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-ink">{title}</h3>
        {onCopy && (
          <button
            onClick={onCopy}
            aria-label={`Copier : ${title}`}
            className="text-muted hover:text-brand"
          >
            <Copy size={15} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
