import Image from "next/image";

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
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
        {image ? (
          <figure className="relative min-h-[210px] overflow-hidden border-y border-line bg-canvas sm:min-h-[240px]">
            <Image
              src={image}
              alt={imageAlt || ""}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 38vw"
              className="object-cover transition duration-700 hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 text-sm leading-6 text-white sm:p-6">
              {description}
            </figcaption>
          </figure>
        ) : (
          <p className="max-w-md border-t border-line pt-5 text-sm leading-7 text-muted sm:text-base sm:leading-8">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
