import Image from "next/image";
import { BookOpen, CheckCircle2, HeartHandshake, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "À propos" };

const missions = [
  [BookOpen, "Rendre accessible", "Une interface lisible sur ordinateur, tablette et mobile."],
  [ShieldCheck, "Rester traçable", "Chaque contenu reste relié à sa source et à son statut."],
  [
    HeartHandshake,
    "Transmettre fidèlement",
    "La technologie sert le texte, sans se substituer aux personnes compétentes.",
  ],
] as const;

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="Notre mission"
        title="Préserver une œuvre, faciliter sa lecture"
        description="Xassida Search rassemble des outils de recherche et de lecture au service de la transmission des khassaïdes de Cheikh Ahmadou Bamba."
      />
      <section className="mx-auto max-w-[1100px] px-5 py-16 lg:px-8">
        <div className="grid border-y border-line bg-surface md:grid-cols-[.8fr_1.2fr]">
          <figure className="relative min-h-[360px] overflow-hidden md:min-h-[480px]">
            <Image
              src="/images/grande-mosquee-touba.webp"
              alt="Grande Mosquée de Touba"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover object-center"
            />
          </figure>
          <div className="flex flex-col justify-end p-7 sm:p-10 lg:p-14">
            <span className="folio-label">Lieu de transmission · Touba</span>
            <p className="mt-12 font-arabic text-4xl leading-relaxed text-brand" dir="rtl">
              طوبى
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
              Une bibliothèque vivante, enracinée à Touba.
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted">
              Le projet prolonge numériquement une tradition de lecture, de mémorisation et de
              transmission.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {missions.map(([Icon, title, text]) => (
            <Card key={title} className="p-7">
              <Icon className="text-brand" size={25} />
              <h2 className="mt-5 font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-8 p-8 sm:p-10">
          <div className="flex gap-4">
            <CheckCircle2 className="mt-1 shrink-0 text-success" />
            <div>
              <h2 className="text-xl font-semibold text-ink">Une IA limitée par les sources</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                L’assistant répond uniquement à partir des passages disponibles dans le corpus.
                Quand les sources ne suffisent pas, il doit le dire plutôt que d’inventer une
                traduction, un vers ou une attribution.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
