"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowUp, Quote, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { askSourceHref } from "@/lib/passage-links";
type Source = {
  id: string;
  chunk_id?: string;
  title?: string;
  slug?: string;
  quote?: string;
  reference?: string;
};
type Message = { question: string; answer: string; sources: Source[] };
export function AskInterface() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      setMessages((value) => [
        ...value,
        { question: current, answer: body.answer, sources: body.sources || [] },
      ]);
    } catch (reason) {
      setQuestion(current);
      setError(reason instanceof Error ? reason.message : "Réponse indisponible");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-8 lg:py-24">
      <section className="min-h-[640px]">
        <header className="border-y border-line py-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-[.18em] text-gold">DOSSIER</span>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-.035em] text-ink">
                Questionner le corpus
              </h1>
              <p className="mt-0.5 text-xs text-muted">
                Réponses fondées sur les passages du corpus
              </p>
            </div>
          </div>
        </header>
        <div className="space-y-16 py-10 sm:py-14">
          {!messages.length && (
            <div className="max-w-2xl py-14">
              <span className="folio-label">Nouvelle consultation</span>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-.04em] text-ink sm:text-5xl">
                Que souhaitez-vous rechercher ?
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
                Posez une question précise. Les réponses afficheront les khassaïdes et les
                références utilisées.
              </p>
              <div className="mt-8 grid border-t border-line sm:grid-cols-2">
                {[
                  "Que disent les textes sur la patience ?",
                  "Quels passages parlent de Touba ?",
                ].map((item) => (
                  <button
                    onClick={() => setQuestion(item)}
                    key={item}
                    className="border-b border-line py-4 text-left text-xs leading-5 text-muted hover:text-brand sm:pr-6 sm:odd:border-r"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={index}
            >
              <p className="folio-label">Question · {String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-5 max-w-4xl text-2xl font-semibold leading-tight tracking-[-.035em] text-ink sm:text-4xl">
                {message.question}
              </h2>
              <div className="mt-10 border-l border-gold pl-5 sm:pl-10">
                <span className="text-[10px] font-bold uppercase tracking-[.18em] text-muted">
                  Réponse documentée
                </span>
                <div className="mt-5 flex gap-3">
                  <p className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-ink sm:text-lg sm:leading-9">
                    {message.answer}
                  </p>
                </div>
                {message.sources.length > 0 && (
                  <div className="-ml-5 mt-12 border-t border-line pt-7 sm:-ml-10">
                    <h3 className="folio-label">Passages utilisés — à vérifier</h3>
                    <div className="mt-6 border-b border-line">
                      {message.sources.map((source, sourceIndex) => (
                        <Link
                          href={askSourceHref(source)}
                          key={source.id}
                          className="group grid grid-cols-[36px_minmax(0,1fr)_auto] border-t border-line py-6 transition hover:border-brand"
                        >
                          <span className="text-[10px] font-bold text-gold">
                            {String(sourceIndex + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-ink">
                              {source.title || "Passage du corpus"}
                            </div>
                            <p className="mt-1 text-xs text-muted">{source.reference}</p>
                            {source.quote && (
                              <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-7 text-ink/80">
                                {source.quote}
                              </p>
                            )}
                          </div>
                          <span className="self-center text-xs font-semibold text-brand">
                            Vérifier →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.article>
          ))}
          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="size-2 animate-pulse rounded-full bg-brand" />
              Recherche dans les sources…
            </div>
          )}
        </div>
        <form
          onSubmit={ask}
          className="sticky bottom-0 border-y border-line bg-surface/95 py-4 backdrop-blur"
        >
          <div className="flex items-end gap-2 focus-within:border-brand/30">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-ink outline-none"
              placeholder="Posez votre question sur les khassaïdes…"
            />
            <button
              disabled={loading || question.trim().length < 5}
              className="grid size-11 shrink-0 place-items-center border border-brand text-brand disabled:opacity-40"
              aria-label="Envoyer"
            >
              <ArrowUp size={18} />
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </form>
      </section>
      <aside className="mt-12 grid gap-8 border-t border-line pt-8 sm:grid-cols-2">
        <div>
          <ShieldCheck className="text-success" size={22} />
          <h2 className="mt-4 text-sm font-semibold text-ink">Réponses sourcées</h2>
          <p className="mt-2 text-xs leading-5 text-muted">
            L’assistant doit s’appuyer uniquement sur les passages publiés et signaler quand ils ne
            suffisent pas.
          </p>
        </div>
        <div className="border-l border-line pl-6">
          <Quote className="text-gold" size={22} />
          <h2 className="mt-4 text-sm font-semibold text-ink">Toujours vérifier</h2>
          <p className="mt-2 text-xs leading-5 text-muted">
            Consultez le passage et sa source originale avant de reprendre une réponse ou une
            traduction.
          </p>
        </div>
      </aside>
    </div>
  );
}
