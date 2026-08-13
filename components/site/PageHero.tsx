export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-14 sm:grid-cols-[minmax(0,1fr)_minmax(260px,.55fr)] sm:items-end sm:py-24 lg:px-8">
        <div className="border-l border-gold pl-5 sm:pl-8">
          <span className="folio-label">{eyebrow}</span>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[.98] tracking-[-.055em] text-ink sm:text-6xl">
            {title}
          </h1>
        </div>
        <p className="max-w-md border-t border-line pt-5 text-sm leading-7 text-muted sm:text-base sm:leading-8">
          {description}
        </p>
      </div>
    </header>
  );
}
