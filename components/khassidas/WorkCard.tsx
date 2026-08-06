import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, Eye, FileText, Headphones } from "lucide-react";
import type { Khassida } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type WorkStats={verses?:number;pages?:number;hasAudio?:boolean};
export function WorkCard({work,stats,className}:{work:Khassida;stats?:WorkStats;className?:string}){
  return <article className={cn("group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-lift",className)}>
    <div className="flex gap-4"><div className="relative grid h-28 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-950 to-emerald-800 p-2 text-center text-gold shadow-md"><span className="absolute inset-1 rounded border border-gold/30"/><span className="font-arabic text-lg leading-7">{work.arabic_title||"خَصَائِد"}</span></div><div className="min-w-0 flex-1"><Badge className="border-success/15 bg-success/10 text-success"><CheckCircle2 size={12}/> Vérifié</Badge><h3 className="mt-2 line-clamp-2 text-[15px] font-semibold text-ink">{work.title}</h3><p dir="rtl" className="mt-1 truncate font-arabic text-lg text-muted">{work.arabic_title}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">{stats?.verses?<span className="flex items-center gap-1"><BookOpen size={11}/>{stats.verses} vers</span>:null}{stats?.pages?<span className="flex items-center gap-1"><FileText size={11}/>{stats.pages} pages</span>:null}{(stats?.hasAudio||work.audio_url)&&<span className="flex items-center gap-1"><Clock3 size={11}/>Audio</span>}</div></div></div>
    <div className="absolute inset-x-0 bottom-0 flex translate-y-full gap-2 border-t border-line bg-surface/95 p-3 backdrop-blur transition duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0"><Link className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-2 py-2 text-xs font-semibold text-white" href={`/khassidas/${work.slug}`}><BookOpen size={14}/>Lire</Link>{(stats?.hasAudio||work.audio_url)&&<Link className="grid size-8 place-items-center rounded-lg border border-line text-success" href={`/khassidas/${work.slug}?mode=audio`} aria-label="Écouter"><Headphones size={14}/></Link>}<Link className="grid size-8 place-items-center rounded-lg border border-line text-muted" href={`/khassidas/${work.slug}`} aria-label="Voir"><Eye size={14}/></Link></div>
  </article>
}
