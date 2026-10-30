import { BadgeCheck, Car, ChevronRight, Clock, FileSearch, HandCoins, KeyRound, MessageCircle, Repeat, Search, ShieldCheck, Star, Truck, Wrench, type LucideIcon } from "lucide-react";
import type { Engagement, Horaire, IconeEngagement, QuestionFaq } from "@/lib/site/reglages-defaut";
import type { AvisPublic } from "@/lib/site/reglages-publics";
import { cn } from "@/lib/utils";

const ICONES: Record<IconeEngagement, LucideIcon> = {
  "badge-check": BadgeCheck,
  "file-search": FileSearch,
  car: Car,
  repeat: Repeat,
  "shield-check": ShieldCheck,
  wrench: Wrench,
  truck: Truck,
  "hand-coins": HandCoins,
  clock: Clock,
  star: Star,
};

/** Engagements activés dans le CRM : icône fine, titre, phrase. `bande` = version compacte sous le hero. */
export function Engagements({ engagements, bande }: { engagements: Engagement[]; bande?: boolean }) {
  if (engagements.length === 0) return null;
  return (
    <ul className={cn("grid gap-6", bande ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
      {engagements.map((e) => {
        const Icone = ICONES[e.icone];
        return (
          <li key={e.titre} className={cn("flex gap-4", bande ? "items-center" : "flex-col rounded-carte border border-white/[0.08] bg-site-carte p-7")}>
            <span className={cn("inline-flex shrink-0 items-center justify-center rounded-[14px] bg-site-accent-fond text-site-sur-accent", bande ? "size-11" : "size-14")}>
              <Icone className={bande ? "size-6" : "size-7"} strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h3 className="s-titre-4">{e.titre}</h3>
              {e.phrase && <p className={cn("text-site-2", bande ? "s-petit mt-1" : "mt-2")}>{e.phrase}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ETAPES = [
  { icone: Search, titre: "Vous choisissez", texte: "Photos réelles, caractéristiques complètes et prix affiché, sans surprise." },
  { icone: MessageCircle, titre: "On en parle", texte: "Une question, une visite, un essai ? Un message WhatsApp suffit." },
  { icone: KeyRound, titre: "Vous roulez", texte: "Vous essayez la voiture, puis nous préparons ensemble les documents de la vente." },
];

/** « Comment ça se passe » : 3 étapes, numéros dans des carrés jaunes reliés par un trait qui se dessine. */
export function Etapes() {
  return (
    <div className="relative">
      <div className="s-trait absolute inset-x-0 top-8 hidden h-0.5 bg-[linear-gradient(90deg,var(--site-accent),rgba(255,255,255,0.08))] md:block" aria-hidden />
      <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-3">
        {ETAPES.map((e, i) => (
          <li key={e.titre} className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="s-condense inline-flex size-16 items-center justify-center rounded-[16px] bg-site-accent-fond text-[34px] text-site-sur-accent">{i + 1}</span>
              <e.icone className="size-6 text-site-2 md:hidden" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="s-titre-3 mt-2">{e.titre}</h3>
            <p className="text-site-2">{e.texte}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Carte d'un avis client (réel). */
export function CarteAvis({ avis, className }: { avis: AvisPublic; className?: string }) {
  return (
    <figure className={cn("flex h-full flex-col gap-4 rounded-carte border border-white/[0.08] bg-site-carte p-7", className)}>
      <div className="flex gap-0.5" role="img" aria-label={`Note : ${avis.note} sur 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn("size-[18px]", i <= avis.note ? "fill-[var(--site-accent)] text-site-accent" : "text-white/20")} strokeWidth={1.5} aria-hidden />
        ))}
      </div>
      <blockquote className="flex-1 text-[17px]">« {avis.texte} »</blockquote>
      <figcaption className="s-petit text-site-2">
        <span className="font-semibold text-site-texte">{avis.auteur}</span>
        {avis.vehiculeAchete && <> · {avis.vehiculeAchete}</>}
        <br />
        {avis.date} · avis {avis.source}
      </figcaption>
    </figure>
  );
}

/** Questions fréquentes : <details> natif (clavier, lecteurs d'écran), chevron qui pivote. */
export function Faq({ questions }: { questions: QuestionFaq[] }) {
  if (questions.length === 0) return null;
  return (
    <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
      {questions.map((q) => (
        <details key={q.question} className="group">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-[17px] font-semibold md:text-[19px]">
            {q.question}
            <ChevronRight className="s-chevron s-transition size-5 shrink-0 text-site-accent transition-transform" strokeWidth={2} aria-hidden />
          </summary>
          <p className="whitespace-pre-line pb-5 pr-8 text-site-2">{q.reponse}</p>
        </details>
      ))}
    </div>
  );
}

/** Horaires de la semaine (jour fermé indiqué). */
export function Horaires({ horaires, className }: { horaires: Horaire[]; className?: string }) {
  if (!horaires.some((h) => h.ouvert)) return null;
  return (
    <dl className={cn("s-petit grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5", className)}>
      {horaires.map((h) => (
        <div key={h.jour} className="contents">
          <dt className="font-medium">{h.jour}</dt>
          <dd className={h.ouvert ? "s-chiffres" : "text-site-2"}>{h.ouvert ? h.plages || "Ouvert" : "Fermé"}</dd>
        </div>
      ))}
    </dl>
  );
}
