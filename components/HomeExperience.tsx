"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {Icon} from "@/components/Icon";
import type {Khassida} from "@/types/database";

type Result={kind:"khassida"|"chunk";khassida:Khassida};
const order=["masaalikul-jinaan","tazawwudush-shubban","jawharul-maani","al-hikam","safinatul-aman"];

export function HomeExperience(){
  const [query,setQuery]=useState("");const [results,setResults]=useState<Result[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  async function search(event?:FormEvent){event?.preventDefault();setLoading(true);setError("");try{const response=await fetch(`/api/search?q=${encodeURIComponent(query)}`);const body=await response.json();if(!response.ok)throw new Error(body.error);setResults(body.results)}catch(reason){setError(reason instanceof Error?reason.message:"Recherche impossible")}finally{setLoading(false)}}
  useEffect(()=>{search()},[]);// eslint-disable-line react-hooks/exhaustive-deps
  const popular=useMemo(()=>{const unique=new Map<string,Result>();results.forEach(result=>unique.set(result.khassida.id,result));return [...unique.values()].sort((a,b)=>{const ai=order.indexOf(a.khassida.slug),bi=order.indexOf(b.khassida.slug);return(ai<0?99:ai)-(bi<0?99:bi)}).slice(0,5)},[results]);
  return <main className="showcase-home">
    <section className="showcase-hero">
      <div className="hero-pattern"/><img className="hero-book" src="/images/open-manuscript.png" alt="Manuscrit ouvert sur un support en bois"/>
      <div className="showcase-copy"><h1>Le moteur de recherche des<br/>khassaïdes de <strong>Cheikh Ahmadou Bamba</strong></h1><p>Recherchez, lisez et écoutez les khassaïdes dans<br/>leur intégralité avec des traductions et des sources fiables.</p>
        <form onSubmit={search}><Icon name="search" size={20}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Rechercher un khassida, un vers, un mot arabe, un thème…"/><button aria-label="Rechercher">{loading?"…":<Icon name="search" size={21}/>}</button></form>
        <div className="search-types"><span>Rechercher par :</span><button onClick={()=>setQuery("khassida")}><Icon name="book" size={13}/> Khassida</button><button><Icon name="file" size={13}/> Vers</button><button><Icon name="arabic" size={13}/> Mot arabe</button><button><Icon name="tag" size={13}/> Thème</button><button><Icon name="bot" size={13}/> Question IA</button></div>
        <div className="hero-shortcuts"><a href="#popular"><Icon name="book" size={24}/><span>Lire</span></a><a href="#popular" className="green"><Icon name="headphones" size={24}/><span>Écouter</span></a><a href="#assistant" className="purple"><Icon name="bot" size={24}/><span>Recherche IA</span></a><a href="#popular" className="gold"><Icon name="school" size={24}/><span>Bibliothèque</span></a></div>
      </div>
    </section>
    <section id="popular" className="showcase-popular"><header><h2><Icon name="spark" size={18}/> Khassaïdes populaires</h2><a href="#popular">Voir tout →</a></header>{error&&<p className="notice">{error}</p>}<div className="showcase-cards">{popular.map((result,index)=><a className={`showcase-card tone-${index}`} href={`/khassidas/${result.khassida.slug}`} key={result.khassida.id}><p>{result.khassida.arabic_title}</p><h3>{result.khassida.title}</h3><span><Icon name="check" size={11}/> Publié</span><small>{result.khassida.themes.slice(0,2).join(" · ")}</small><footer><Icon name="book" size={14}/><Icon name="headphones" size={14}/><Icon name="file" size={14}/></footer></a>)}</div></section>
    <section id="assistant" className="showcase-features"><div><Icon name="shield" size={27}/><span><strong>Contenu publié</strong><small>Textes rattachés à leurs sources.</small></span></div><div><Icon name="book" size={27}/><span><strong>Sources authentiques</strong><small>Basé sur des éditions identifiées.</small></span></div><div><Icon name="headphones" size={27}/><span><strong>Audio de qualité</strong><small>Récitations clairement attribuées.</small></span></div><div><Icon name="check" size={27}/><span><strong>Transmission fidèle</strong><small>Préserver l’héritage de Serigne Touba.</small></span></div></section>
  </main>
}
