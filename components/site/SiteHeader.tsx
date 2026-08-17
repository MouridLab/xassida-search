"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleUserRound,
  Library,
  Menu,
  Moon,
  Search,
  Sun,
  Users,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const links = [
  ["Ouverture", "/", BookOpen],
  ["Œuvres", "/khassidas", Library],
  ["Bibliothèque", "/bibliotheque", BookOpen],
  ["Questionner", "/recherche-ia", Search],
  ["Communauté", "/communaute", Users],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const enabled =
      localStorage.getItem("xassida-theme") === "dark" ||
      (!localStorage.getItem("xassida-theme") &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);
  function toggleTheme() {
    const value = !dark;
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    localStorage.setItem("xassida-theme", value ? "dark" : "light");
  }
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1380px] items-center gap-4 px-5 lg:px-8">
        <Logo />
        <nav className="ml-auto hidden h-full items-center xl:flex">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative grid h-full place-items-center px-4 text-[11px] font-semibold uppercase tracking-[.12em] text-muted transition hover:text-ink",
                pathname === href &&
                  "text-ink after:absolute after:bottom-0 after:h-px after:w-full after:bg-gold",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 xl:ml-3">
          <Link
            href="/search"
            className="hidden h-10 items-center gap-2 border-l border-line pl-5 text-[11px] font-semibold uppercase tracking-[.12em] text-muted transition hover:text-ink sm:flex"
            aria-label="Rechercher"
          >
            <Search size={18} />
            <span className="hidden lg:inline">Index</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="grid size-10 place-items-center text-muted transition hover:text-ink"
            aria-label={dark ? "Mode clair" : "Mode sombre"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href="/admin"
            className="grid size-10 place-items-center text-muted transition hover:text-ink"
            aria-label="Profil"
          >
            <CircleUserRound size={20} />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="grid size-10 place-items-center rounded-xl text-muted xl:hidden"
            aria-label="Menu"
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          className="min-h-[calc(100vh-72px)] border-t border-line bg-surface px-6 py-10 xl:hidden"
          aria-label="Sommaire"
        >
          <p className="folio-label mb-8">Sommaire</p>
          {links.map(([label, href, Icon]) => (
            <Link
              onClick={() => setOpen(false)}
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-4 border-b border-line py-5 text-lg font-medium text-muted",
                pathname === href && "text-brand",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
