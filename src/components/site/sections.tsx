import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ReglagesPublics } from "@/lib/site/reglages-publics";
import { Engagements, Horaires } from "./blocs";
import { Bouton } from "./bouton";
import { Conteneur, EnTeteSection, Section } from "./mise-en-page";

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

/** Bloc « Contact » : WhatsApp d'abord, puis téléphone, email, adresse, horaires, carte. */
export function BlocContact({ r, lienWhatsApp, titre = "Une question ?", niveau = 2 }: { r: ReglagesPublics; lienWhatsApp: string | null; titre?: string; niveau?: 1 | 2 }) {
  const Titre = niveau === 1 ? "h1" : "h2";
  const SousTitre = niveau === 1 ? "h2" : "h3"; // ordre des titres respecté (accessibilité)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 rounded-carte bg-site-fond-alt p-6 md:grid-cols-2 md:p-10">
      <div className="flex flex-col gap-5">
        <Titre className={niveau === 1 ? "s-titre-1" : "s-titre-2"}>{titre}</Titre>
        <p className="s-intro">{lienWhatsApp ? "Le plus simple : écrivez-nous sur WhatsApp." : "Contactez-nous, nous vous répondons rapidement."}</p>
        {r.delaiReponse && (
          <p className="flex items-center gap-2 text-site-2">
            <Clock className="size-5 shrink-0" strokeWidth={1.5} aria-hidden /> {r.delaiReponse}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {lienWhatsApp && (
            <Bouton href={lienWhatsApp} externe variante="whatsapp">
              Écrire sur WhatsApp
            </Bouton>
          )}
          {r.telephone && (
            <Bouton href={tel(r.telephone)} variante="contour">
              <Phone strokeWidth={1.5} aria-hidden /> <span className="s-chiffres">{r.telephone}</span>
            </Bouton>
          )}
        </div>
        <ul className="flex flex-col gap-2 text-site-2">
          {r.email && (
            <li>
              <a href={`mailto:${r.email}`} className="inline-flex min-h-11 items-center gap-2 break-all hover:text-site-texte">
                <Mail className="size-5 shrink-0" strokeWidth={1.5} aria-hidden /> {r.email}
              </a>
            </li>
          )}
          {r.adresse && (
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} aria-hidden />
              <span>
                <span className="whitespace-pre-line">{r.adresse}</span>
                {r.lienGoogleMaps && (
                  <>
                    <br />
                    <Bouton href={r.lienGoogleMaps} externe variante="secondaire" taille="compact" className="!px-0">
                      Voir sur Google Maps
                    </Bouton>
                  </>
                )}
              </span>
            </li>
          )}
        </ul>
      </div>
      {r.horaires.some((h) => h.ouvert) && (
        <div>
          <SousTitre className="s-titre-4 mb-4">Horaires</SousTitre>
          <Horaires horaires={r.horaires} />
        </div>
      )}
    </div>
  );
}

/** « Pourquoi nous faire confiance » : engagements activés + chiffres réels. Rien d'affiché s'il n'y a rien de vrai à dire. */
export function SectionConfiance({ r, nombreVendus, fond = "gris" }: { r: ReglagesPublics; nombreVendus: number | null; fond?: "blanc" | "gris" }) {
  const anneeCourante = new Date().getFullYear();
  const chiffres = [
    nombreVendus !== null && { valeur: new Intl.NumberFormat("fr-FR").format(nombreVendus), libelle: "véhicules vendus" },
    r.anneeCreation && r.anneeCreation <= anneeCourante && { valeur: `Depuis ${r.anneeCreation}`, libelle: anneeCourante - r.anneeCreation >= 1 ? `${anneeCourante - r.anneeCreation} an${anneeCourante - r.anneeCreation > 1 ? "s" : ""} d'activité` : "à votre service" },
  ].filter((c): c is { valeur: string; libelle: string } => !!c);
  if (r.engagements.length === 0 && chiffres.length === 0) return null;
  return (
    <Section fond={fond}>
      <Conteneur>
        <EnTeteSection titre="Pourquoi nous faire confiance" />
        {chiffres.length > 0 && (
          <dl className="mb-10 grid grid-cols-2 gap-6 md:flex md:gap-16">
            {chiffres.map((c) => (
              <div key={c.libelle}>
                <dt className="sr-only">{c.libelle}</dt>
                <dd className="s-chiffres text-[40px] font-bold leading-none tracking-[-0.03em] md:text-[56px]">{c.valeur}</dd>
                <dd className="mt-2 text-site-2">{c.libelle}</dd>
              </div>
            ))}
          </dl>
        )}
        <Engagements engagements={r.engagements} />
      </Conteneur>
    </Section>
  );
}
