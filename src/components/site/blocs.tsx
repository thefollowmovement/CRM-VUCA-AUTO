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
          <li key={e.titre} className={cn("flex gap-4", bande ? "items-center" : "flex-col rounded-carte bg-site-carte p-6 shadow-site")}>
            <Icone className={cn("shrink-0 text-site-accent", bande ? "size-7" : "size-8")} strokeWidth={1.5} aria-hidden />
            <div>
              <h3 className={bande ? "text-[17px] font-semibold" : "s-titre-4"}>{e.titre}</h3>
              {e.phrase && <p className={cn("text-site-2", bande ? "s-petit" : "mt-1")}>{e.phrase}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ETAPES = [
  { icone: Search, titre: "Vous choisissez", texte: "Parcourez nos voitures : photos, caractéristiques et prix, sans surprise." },
  { icone: MessageCircle, titre: "On en parle sur WhatsApp", texte: "Une question, une visite ? Écrivez-nous, on vous répond directement." },
  { icone: KeyRound, titre: "Essai et achat en toute sérénité", texte: "Vous essayez la voiture, puis nous établissons ensemble les documents de la vente." },
];

/** « Comment ça se passe » : 3 étapes numérotées. */
export function Etapes() {
  return (
    <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {ETAPES.map((e, i) => (
        <li key={e.titre} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="s-chiffres inline-flex size-10 items-center justify-center rounded-full bg-site-accent text-[17px] font-semibold text-site-sur-accent">{i + 1}</span>
            <e.icone className="size-6 text-site-2" strokeWidth={1.5} aria-hidden />
          </div>
          <h3 className="s-titre-4">{e.titre}</h3>
          <p className="text-site-2">{e.texte}</p>
        </li>
      ))}
    </ol>
  );
}


/** Carte d'un avis client (réel). */
export function CarteAvis({ avis, className }: { avis: AvisPublic; className?: string }) {
  return (
    <figure className={cn("flex h-full flex-col gap-4 rounded-carte bg-site-carte p-6 shadow-site", className)}>
      <div className="flex gap-0.5" role="img" aria-label={`Note : ${avis.note} sur 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn("size-[18px]", i <= avis.note ? "fill-[#ff9f0a] text-[#ff9f0a]" : "text-site-sep")} strokeWidth={1.5} aria-hidden />
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
    <div className="divide-y divide-site-sep border-y border-site-sep">
      {questions.map((q) => (
        <details key={q.question} className="group">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-[17px] font-semibold md:text-[19px]">
            {q.question}
            <ChevronRight className="s-chevron s-transition size-5 shrink-0 text-site-2 transition-transform" strokeWidth={1.75} aria-hidden />
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
