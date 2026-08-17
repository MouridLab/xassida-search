import Link from "next/link";
import {
  ArrowUpRight,
  BookCheck,
  CircleAlert,
  Code2,
  HeartHandshake,
  Scale,
  Users,
} from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Communauté",
  description: "Participer à la transmission et à l’amélioration de Xassida Search.",
};

const contributions = [
  {
    icon: CircleAlert,
    title: "Signaler une erreur",
    text: "Indiquez l’œuvre, le passage concerné, la correction proposée et, si possible, une source consultable.",
  },
  {
    icon: BookCheck,
    title: "Proposer une source",
    text: "Partagez un texte, une édition ou un enregistrement en précisant sa provenance et ses conditions d’utilisation.",
  },
  {
    icon: Code2,
    title: "Contribuer au projet",
    text: "Améliorez l’accessibilité, la recherche, la documentation ou les tests depuis le dépôt public.",
  },
] as const;

const steps = [
  ["01", "Proposition", "La contribution est accompagnée de sa provenance et de son contexte."],
  ["02", "Relecture", "Une personne compétente vérifie le texte, la source et l’attribution."],
  ["03", "Validation", "Les contenus validés sont clairement distingués des contenus en révision."],
  ["04", "Publication", "La correction est publiée en conservant sa source et sa traçabilité."],
] as const;

export default function CommunityPage() {
  return (
    <main>
      <PageHero
        eyebrow="Participer"
        title="Une communauté au service de la transmission"
        description="Lecteurs, chercheurs, traducteurs, récitateurs et développeurs peuvent contribuer, avec une même exigence : respecter les textes et identifier les sources."
      />

      <section className="mx-auto max-w-[1200px] px-5 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {contributions.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-7">
              <Icon className="text-brand" size={25} />
              <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
            </Card>
          ))}
        </div>

        <div className="mt-14 grid gap-10 border-y border-line py-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <span className="folio-label">Notre méthode</span>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-.04em] text-ink">
              Chaque contribution suit un parcours clair.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Une proposition n’est jamais présentée comme validée avant sa relecture. La
              technologie facilite le travail ; elle ne remplace pas la compétence éditoriale et
              culturelle.
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {steps.map(([number, title, text]) => (
              <li key={number} className="bg-surface p-6">
                <span className="text-xs font-semibold tracking-[.18em] text-gold">{number}</span>
                <h3 className="mt-4 font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="p-8 sm:p-10">
            <Users className="text-brand" size={28} />
            <h2 className="mt-5 text-2xl font-semibold tracking-[-.03em] text-ink">
              Faire une proposition
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Le canal public actuel est le dépôt MouridLab. Ouvrez une demande en donnant le plus
              de contexte possible, sans publier de données personnelles ni de document dont les
              droits ne sont pas clarifiés.
            </p>
            <a
              href="https://github.com/MouridLab/xassida-search/issues/new"
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Ouvrir une proposition <ArrowUpRight size={16} />
            </a>
          </Card>

          <Card className="p-8 sm:p-10">
            <HeartHandshake className="text-gold" size={28} />
            <h2 className="mt-5 text-xl font-semibold text-ink">Cadre de confiance</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Bienveillance, rigueur et respect du patrimoine guident tous les échanges et toutes
              les publications.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-brand">
              <a
                href="https://github.com/MouridLab/xassida-search/blob/main/CODE_OF_CONDUCT.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Scale size={16} /> Code de conduite
              </a>
              <Link href="/a-propos" className="inline-flex items-center gap-2">
                Notre mission <ArrowUpRight size={16} />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
