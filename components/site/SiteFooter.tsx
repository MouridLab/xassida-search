import Link from "next/link";
import { BookOpen, Code2, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">
            Une plateforme dédiée à la lecture, à la préservation et à la transmission fidèle des
            khassaïdes de Cheikh Ahmadou Bamba.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Explorer</h3>
          <nav className="mt-4 grid gap-3 text-sm text-muted">
            <Link href="/khassidas">Khassaïdes</Link>
            <Link href="/themes">Thèmes</Link>
            <Link href="/recherche-ia">Recherche IA</Link>
          </nav>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Xassida Search</h3>
          <nav className="mt-4 flex gap-2">
            <Link
              className="grid size-9 place-items-center rounded-lg border border-line text-muted"
              href="/communaute"
              aria-label="Communauté"
            >
              <MessageCircle size={16} />
            </Link>
            <a
              className="grid size-9 place-items-center rounded-lg border border-line text-muted"
              href="https://github.com/MouridLab/xassida-search"
              target="_blank"
              rel="noreferrer"
              aria-label="Code source sur GitHub"
            >
              <Code2 size={16} />
            </a>
            <span className="grid size-9 place-items-center text-brand">
              <BookOpen size={17} />
            </span>
          </nav>
        </div>
      </div>
      <div className="border-t border-line px-5 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Xassida Search · Transmission fidèle, sources identifiées.
      </div>
    </footer>
  );
}
