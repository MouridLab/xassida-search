"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Bot,
  ChevronRight,
  Compass,
  Home,
  Heart,
  Library,
  Menu,
  Mic2,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const primaryLinks = [
  ["Explorer", "/khassidas", Compass],
  ["Bibliothèque", "/bibliotheque", Library],
  ["Kourels", "/kourels", Mic2],
  ["Thèmes", "/themes", BookMarked],
  ["Recherche IA", "/recherche-ia", Bot],
] as const;

const secondaryLinks = [
  ["Mes favoris", "/favoris", Heart],
  ["Collections", "/collections", Sparkles],
  ["Communauté", "/communaute", Users],
] as const;

function currentSection(pathname: string) {
  if (pathname.startsWith("/khassidas/")) return "Lecture";
  if (pathname.startsWith("/khassidas")) return "Khassaïdes";
  if (pathname.startsWith("/bibliotheque/")) return "Document";
  if (pathname.startsWith("/bibliotheque")) return "Bibliothèque";
  if (pathname.startsWith("/kourels")) return "Prestations des kourels";
  if (pathname.startsWith("/favoris")) return "Mes favoris";
  if (pathname.startsWith("/recherche-ia")) return "Questionner le corpus";
  if (pathname.startsWith("/search")) return "Résultats de recherche";
  if (pathname.startsWith("/themes")) return "Thèmes";
  if (pathname.startsWith("/collections")) return "Collections";
  return "Explorer";
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BrowserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const section = currentSection(pathname);

  useEffect(() => {
    const enabled =
      localStorage.getItem("xassida-theme") === "dark" ||
      (!localStorage.getItem("xassida-theme") &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function toggleTheme() {
    const enabled = !dark;
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
    localStorage.setItem("xassida-theme", enabled ? "dark" : "light");
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink lg:hidden"
            aria-label="Ouvrir la navigation"
          >
            <Menu size={19} />
          </button>

          <div className="hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => router.back()}
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Page précédente"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => router.forward()}
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Page suivante"
            >
              <ArrowRight size={17} />
            </button>
            <Link
              href="/"
              className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Accueil"
            >
              <Home size={17} />
            </Link>
          </div>

          <form
            onSubmit={submitSearch}
            role="search"
            className="mx-auto flex h-10 w-full max-w-2xl items-center gap-3 rounded-xl border border-line bg-canvas/70 px-3 shadow-sm transition focus-within:border-gold focus-within:bg-surface"
          >
            <Search size={16} className="shrink-0 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher dans le corpus…"
              aria-label="Rechercher dans le corpus"
              maxLength={120}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            <kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted sm:inline">
              /
            </kbd>
          </form>

          <button
            type="button"
            onClick={toggleTheme}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink"
            aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex h-10 items-end border-t border-line/70 px-3 lg:pl-[252px]">
          <div className="flex h-9 min-w-0 max-w-[320px] items-center gap-2 rounded-t-xl border border-b-0 border-line bg-canvas px-3 text-xs font-medium text-ink">
            <BookOpen size={14} className="shrink-0 text-brand" />
            <span className="truncate">{section}</span>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "grid min-h-[calc(100vh-104px)]",
          sidebarCollapsed
            ? "lg:grid-cols-[76px_minmax(0,1fr)]"
            : "lg:grid-cols-[240px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-[60] flex w-[280px] flex-col border-r border-line bg-surface p-4 shadow-2xl transition-transform lg:sticky lg:top-[104px] lg:z-30 lg:h-[calc(100vh-104px)] lg:w-auto lg:translate-x-0 lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between lg:hidden">
            <Logo />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="grid size-10 place-items-center rounded-xl text-muted"
              aria-label="Fermer la navigation"
            >
              <X size={19} />
            </button>
          </div>

          <div className="hidden min-h-10 items-center lg:flex">
            {!sidebarCollapsed && <Logo />}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className={cn(
                "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink",
                !sidebarCollapsed && "ml-auto",
              )}
              aria-label={sidebarCollapsed ? "Déployer la navigation" : "Réduire la navigation"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>

          <nav className="mt-8 grid gap-1" aria-label="Navigation documentaire">
            {primaryLinks.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink",
                  isActive(pathname, href) && "bg-brand/10 text-brand",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>

          <div className="my-5 border-t border-line" />

          <nav className="grid gap-1" aria-label="Raccourcis">
            {secondaryLinks.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted transition hover:bg-canvas hover:text-ink",
                  sidebarCollapsed && "justify-center px-0",
                )}
              >
                <Icon size={17} className="shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="mt-auto rounded-2xl border border-line bg-canvas p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                Corpus sourcé
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Chaque contenu public reste relié à sa source et à son statut de validation.
              </p>
            </div>
          )}
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-ink/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer la navigation"
          />
        )}

        <div className="min-w-0 bg-canvas pb-16 lg:pb-0">
          <div className="flex h-10 items-center gap-2 border-b border-line bg-surface/60 px-5 text-[11px] text-muted lg:px-8">
            <span>Corpus</span>
            <ChevronRight size={12} />
            <span className="truncate font-medium text-ink">{section}</span>
          </div>
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-line bg-surface/95 px-2 backdrop-blur-xl lg:hidden">
        {primaryLinks.map(([label, href, Icon]) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[9px] font-semibold text-muted",
              isActive(pathname, href) && "text-brand",
            )}
          >
            <Icon size={18} />
            <span>{label === "Recherche IA" ? "IA" : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
