"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Chunk, Khassida } from "@/types/database";

export function ReaderView({work,chunks,related}:{work:Khassida;chunks:Chunk[];related:Pick<Khassida,"slug"|"title"|"arabic_title">[]}){
  const [active,setActive]=useState(0);const [tab,setTab]=useState<"text"|"translation"|"transcription"|"commentary">("text");
  const chunk=chunks[active];const pages=useMemo(()=>chunks.map((item,index)=>({index,page:item.page_number||index+1})),[chunks]);
  const content=tab==="text"?(chunk?.arabic_text||chunk?.french_translation):tab==="translation"?chunk?.french_translation:tab==="transcription"?chunk?.transcription:chunk?.commentary;
  const lines=(content||"").split(/\n+/).map(line=>line.trim()).filter(Boolean);
  const isArabic=tab==="text"&&Boolean(chunk?.arabic_text);
  function move(delta:number){setActive(value=>Math.max(0,Math.min(chunks.length-1,value+delta)))}
  async function copy(){if(content)await navigator.clipboard.writeText(content)}
  return <main className="reader-shell">
    <section className="reader-left">
      <div className="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/#library">Khassaïdes</a><span>›</span><strong>{work.title}</strong></div>
      <article className="work-identity"><div className="book-cover"><small>XASSIDA</small><b>خ</b><span>{work.arabic_title}</span></div><div><h1>{work.title}</h1><p className="reader-arabic">{work.arabic_title}</p><small>de Cheikh Ahmadou Bamba</small><div className="identity-actions">{work.pdf_url&&<a href={work.pdf_url} target="_blank" rel="noreferrer"><Icon name="file" size={16}/> PDF</a>}{work.audio_url?<a href={work.audio_url} target="_blank" rel="noreferrer"><Icon name="headphones" size={16}/> Audio</a>:<button disabled><Icon name="headphones" size={16}/> Audio</button>}<button><Icon name="heart" size={16}/> Favori</button></div></div></article>
      <article className="reader-summary"><header><strong>SOMMAIRE</strong><button>Réduire</button></header><h3>⌄ Chapitre 1</h3><div>{pages.map(item=><button className={active===item.index?"active":""} onClick={()=>setActive(item.index)} key={`${item.page}-${item.index}`}>Page {item.page}</button>)}</div></article>
      <article className="reader-info"><h3>INFORMATIONS</h3><dl><dt>Édition</dt><dd>{work.source_name||"Source numérique"}</dd><dt>Langue</dt><dd>{chunk?.arabic_text?"Arabe et français":"Français"}</dd><dt>Page</dt><dd>{chunk?.page_number||"—"}</dd><dt>Statut</dt><dd>{work.is_verified?<><span className="status-dot">✓</span> Publié</>:"Brouillon"}</dd><dt>Thèmes</dt><dd>{work.themes.join(", ")||"—"}</dd></dl></article>
      <blockquote className="reader-quote"><b>“</b><p>« Serigne Touba nous a laissé un trésor inestimable. Préservons-le, étudions-le et partageons-le. »</p><small>— Khadimou Rassoul</small></blockquote>
    </section>

    <section className="reader-main">
      <nav className="reader-tabs"><button className={tab==="text"?"active":""} onClick={()=>setTab("text")}>Texte</button><button className={tab==="translation"?"active":""} onClick={()=>setTab("translation")}>Traduction</button><button className={tab==="transcription"?"active":""} onClick={()=>setTab("transcription")}>Transcription</button><button className={tab==="commentary"?"active":""} onClick={()=>setTab("commentary")}>Commentaires</button></nav>
      <div className="reader-controls"><span>Chapitre 1⌄</span><span>Page {chunk?.page_number||"—"}⌄</span><button onClick={()=>move(-1)} disabled={active===0}>‹</button><button onClick={()=>move(1)} disabled={active===chunks.length-1}>›</button><a href={work.pdf_url||"#"} target="_blank">Plein écran ⛶</a></div>
      <article className={`reader-text ${isArabic?"arabic-mode":""}`}>{lines.length?lines.slice(0,22).map((line,index)=><p key={index}><span>{line}</span><b>{index+1}</b></p>):<div className="reader-no-text"><Icon name="book" size={42}/><h2>Texte en cours d’extraction</h2><p>Consultez le document original pour lire cette œuvre.</p>{work.pdf_url&&<a href={work.pdf_url} target="_blank" rel="noreferrer">Ouvrir le PDF</a>}</div>}</article>
      <div className="reader-audio">{work.audio_url?<a className="audio-play" href={work.audio_url} target="_blank" rel="noreferrer"><Icon name="play" size={22}/></a>:<button disabled><Icon name="play" size={22}/></button>}<span>{work.audio_url?"Écouter la récitation":"Audio indisponible"}</span><i/><Icon name="headphones" size={18}/><b>1.0x</b></div>
      <div className="reader-tools"><button onClick={copy}><Icon name="file" size={16}/> Copier le texte</button><button><Icon name="send" size={16}/> Partager</button><button><Icon name="message" size={16}/> Signaler une erreur</button><span>Référence : Page {chunk?.page_number||"—"}</span></div>
    </section>

    <aside className="reader-right">
      <article><h2><Icon name="file" size={19}/> TRADUCTION</h2>{(chunk?.french_translation||"").split(/\n+/).filter(Boolean).slice(0,5).map((line,index)=><p className="numbered" key={index}><b>{index+1}</b><span>{line}</span></p>)}{!chunk?.french_translation&&<p className="reader-muted">Aucune traduction disponible pour ce passage.</p>}</article>
      <article><h2><Icon name="message" size={19}/> COMMENTAIRES <small>(EXTRAIT)</small></h2><p>{chunk?.commentary||"Aucun commentaire attribué n’est disponible pour ce passage."}</p></article>
      <article><header><h2>PASSAGES LIÉS</h2><a href="/#library">Voir tout →</a></header>{related.slice(0,3).map(item=><a className="related-item" href={`/khassidas/${item.slug}`} key={item.slug}><span><Icon name="arabic" size={20}/></span><p><strong>{item.title}</strong><small>{item.arabic_title}</small></p><b>Lire</b></a>)}</article>
      <article className="reader-ask"><div><h2>DEMANDER À XASSIDA SEARCH (IA)</h2><p>Posez une question sur les khassaïdes et obtenez des réponses avec les sources correspondantes.</p><a href="/#assistant"><Icon name="spark" size={15}/> Poser une question</a></div><Icon name="bot" size={58}/></article>
    </aside>

    <section className="reader-trust"><div><Icon name="shield" size={31}/><span><strong>Contenu publié</strong><small>Passages rattachés à leurs sources.</small></span></div><div><Icon name="book" size={31}/><span><strong>Sources authentiques</strong><small>PDF et éditions identifiés.</small></span></div><div><Icon name="headphones" size={31}/><span><strong>Audio de qualité</strong><small>Récitations clairement attribuées.</small></span></div><div><Icon name="lock" size={31}/><span><strong>Transmission fidèle</strong><small>Traçabilité de chaque contenu.</small></span></div></section>
  </main>
}
