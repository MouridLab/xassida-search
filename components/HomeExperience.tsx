"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Chunk, Khassida } from "@/types/database";

type Result = { kind: "khassida" | "chunk"; khassida: Khassida; chunk?: Chunk };
type Source = { id: string; title: string; slug: string; quote: string; reference: string };
const popularOrder = ["masaalikul-jinaan", "tazawwudush-shubban", "jawharul-maani", "al-hikam", "safinatul-aman"];

const themes = [
  ["spark", "Tawhid"], ["school", "Éducation"], ["leaf", "Spiritualité"], ["message", "Le Prophète (sws)"],
  ["mosque", "Touba"], ["leaf", "Exil et Dévouement"], ["hourglass", "Patience"], ["heart", "Purification de l’âme"],
] as const;

export function HomeExperience() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [asking, setAsking] = useState(false);

  async function search(e?: FormEvent) {
    e?.preventDefault(); setSearching(true); setSearchError("");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setResults(body.results);
    } catch (error) { setSearchError(error instanceof Error ? error.message : "Recherche impossible"); }
    finally { setSearching(false); }
  }

  async function ask(e: FormEvent) {
    e.preventDefault(); setAsking(true); setAnswer(""); setSources([]);
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setAnswer(body.answer); setSources(body.sources);
    } catch (error) { setAnswer(error instanceof Error ? error.message : "Assistant indisponible"); }
    finally { setAsking(false); }
  }

  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <main className="reference-home">
    <section className="reference-hero">
      <div className="reference-intro">
        <h1>Xassida Search</h1>
        <p>Recherchez, lisez et écoutez les khassaïdes<br />de Cheikh Ahmadou Bamba</p>
        <form className="reference-search" onSubmit={search}>
          <span><Icon name="search" size={21}/></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un khassida, un vers, un thème…" />
          <button aria-label="Rechercher">{searching ? "…" : <Icon name="search" size={22}/>}</button>
        </form>
        <div className="reference-chips"><button onClick={() => setQuery("arabe")}><Icon name="arabic" size={16}/> Recherche en arabe</button><span><Icon name="file" size={15}/> PDF</span><span><Icon name="headphones" size={15}/> Audio</span><span><Icon name="tag" size={15}/> Thèmes</span><span><Icon name="book" size={15}/> Bibliothèque</span></div>
      </div>
      <blockquote><b>“</b><p>« Serigne Touba nous a laissé<br />un trésor inestimable.<br />Préservons-le, étudions-le<br />et partageons-le. »</p><small>— Khadimou Rassoul</small></blockquote>
      <a className="hero-source" href="https://laviesenegalaise.com/grande-mosquee-de-touba-le-minaret-lamp-fall-point-culminant-de-la-cite-religieuse/" target="_blank" rel="noreferrer">Photo : La Vie Sénégalaise</a>
    </section>

    <section className="reference-dashboard">
      <div className="popular-panel">
        <header><h2><Icon name="spark" size={18}/> <span>Khassaïdes populaires</span></h2><a href="#library">Voir tout →</a></header>
        {searchError && <p className="notice">{searchError}</p>}
        <div id="library" className="reference-works">
          {[...results].sort((a,b) => { const ai=popularOrder.indexOf(a.khassida.slug),bi=popularOrder.indexOf(b.khassida.slug); return (ai<0?99:ai)-(bi<0?99:bi); }).slice(0, 5).map((result, index) => <a href={`/khassidas/${result.khassida.slug}`} className="reference-work" key={`${result.khassida.id}-${index}`}>
            <p>{result.khassida.arabic_title || "قصيدة"}</p><h3>{result.khassida.title}</h3><small>{result.chunk?.arabic_text?.slice(0, 32) || result.khassida.arabic_title || "نص قيد المراجعة"}</small><footer>PDF · Audio · Texte</footer>
          </a>)}
        </div>
        {!searching && !results.length && <div className="reference-empty"><strong>Le corpus est en préparation</strong><span>Publiez les fiches validées depuis l’administration.</span><a href="/admin">Administration →</a></div>}
      </div>

      <aside className="reference-side">
        <section id="assistant" className="reference-ai"><div><h2><Icon name="bot" size={18}/> <span>Demander à Xassida Search (IA)</span></h2><p>Posez une question sur les khassaïdes et obtenez des réponses avec les sources correspondantes.</p><form onSubmit={ask}><input value={question} onChange={e => setQuestion(e.target.value)} required minLength={5} placeholder="Poser une question…" /><button>{asking ? "…" : "→"}</button></form></div><div className="reference-bubble"><Icon name="message" size={36}/></div>{answer && <div className="reference-answer"><strong>Réponse</strong><p>{answer}</p>{sources.map((source, index) => <a key={source.id} href={`/khassidas/${source.slug}`}>[{index + 1}] {source.title} — {source.reference}</a>)}</div>}</section>
        <section id="themes" className="reference-themes"><header><h2>Explorer par thème</h2><a href="#library">Voir tout →</a></header><div>{themes.map(([icon, label]) => <button key={label} onClick={() => { setQuery(label); document.querySelector(".reference-search")?.scrollIntoView({ behavior: "smooth" }); }}><b><Icon name={icon} size={22}/></b><span>{label}</span></button>)}</div></section>
      </aside>
    </section>

    <section className="reference-trust"><div><b><Icon name="shield" size={33}/></b><span><strong>Contenu vérifié</strong><small>Textes et traductions validés<br />par des spécialistes.</small></span></div><div><b><Icon name="book" size={33}/></b><span><strong>Sources authentiques</strong><small>Basé sur des éditions fiables<br />et reconnues.</small></span></div><div><b><Icon name="headphones" size={33}/></b><span><strong>Audio de qualité</strong><small>Récitations par des récitateurs<br />de confiance.</small></span></div><div><b><Icon name="lock" size={33}/></b><span><strong>Transmission fidèle</strong><small>Préserver l’héritage de<br />Serigne Touba.</small></span></div></section>
  </main>;
}
