"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, CircleUserRound, FolderHeart, Info, Library, Menu, Moon, Search, Sun, Tags, X } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const links=[
  ["Accueil","/",BookOpen],["Khassaïdes","/khassidas",Library],["Bibliothèque","/bibliotheque",BookOpen],
  ["Thèmes","/themes",Tags],["Recherche IA","/recherche-ia",Bot],["Collections","/collections",FolderHeart],["À propos","/a-propos",Info],
] as const;

export function SiteHeader(){
  const pathname=usePathname(); const [open,setOpen]=useState(false); const [dark,setDark]=useState(false);
  useEffect(()=>{const enabled=localStorage.getItem("xassida-theme")==="dark"||(!localStorage.getItem("xassida-theme")&&matchMedia("(prefers-color-scheme: dark)").matches);setDark(enabled);document.documentElement.classList.toggle("dark",enabled)},[]);
  function toggleTheme(){const value=!dark;setDark(value);document.documentElement.classList.toggle("dark",value);localStorage.setItem("xassida-theme",value?"dark":"light")}
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-surface/90 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-[1480px] items-center gap-4 px-4 lg:px-7"><Logo/><nav className="ml-auto hidden h-full items-center xl:flex">{links.map(([label,href])=><Link key={href} href={href} className={cn("relative grid h-full place-items-center px-3 text-[13px] font-medium text-muted transition hover:text-brand",pathname===href&&"text-brand after:absolute after:bottom-0 after:h-0.5 after:w-7 after:rounded-full after:bg-brand")}>{label}</Link>)}</nav><div className="ml-auto flex items-center gap-1 xl:ml-3"><Link href="/khassidas" className="hidden size-10 place-items-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-brand sm:grid" aria-label="Rechercher"><Search size={18}/></Link><button onClick={toggleTheme} className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-brand" aria-label={dark?"Mode clair":"Mode sombre"}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><Link href="/admin" className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-brand/5 hover:text-brand" aria-label="Profil"><CircleUserRound size={20}/></Link><button onClick={()=>setOpen(!open)} className="grid size-10 place-items-center rounded-xl text-muted xl:hidden" aria-label="Menu">{open?<X size={21}/>:<Menu size={21}/>}</button></div></div>{open&&<nav className="border-t border-line bg-surface px-4 py-3 xl:hidden">{links.map(([label,href,Icon])=><Link onClick={()=>setOpen(false)} key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted",pathname===href&&"bg-brand/5 text-brand")}><Icon size={18}/>{label}</Link>)}</nav>}</header>
}
