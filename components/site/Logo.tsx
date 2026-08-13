import Link from "next/link";
export function Logo() {
  return (
    <Link
      href="/"
      className="group flex shrink-0 items-center gap-3"
      aria-label="Xassida Search — Accueil"
    >
      <span className="relative grid size-9 place-items-center border border-gold font-arabic text-xl text-brand before:absolute before:inset-1 before:border before:border-gold/30">
        خ
      </span>
      <span className="leading-none">
        <strong className="block text-[17px] font-semibold tracking-[-.03em] text-ink">
          Xassida Search
        </strong>
        <small className="mt-1 hidden text-[8px] font-bold uppercase tracking-[.14em] text-muted sm:block">
          Corpus · lecture · sources
        </small>
      </span>
    </Link>
  );
}
