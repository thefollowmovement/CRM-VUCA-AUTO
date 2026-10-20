// Données structurées schema.org (JSON-LD) pour Google : la concession (AutoDealer) sur l'accueil,
// la voiture et son offre (Car + Offer) sur chaque fiche. Construites UNIQUEMENT à partir des
// objets publics (VehiculePublic, ReglagesPublics) : aucune donnée interne ne peut s'y glisser.
import type { Horaire } from "./reglages-defaut";
import type { ReglagesPublics } from "./reglages-publics";
import type { VehiculePublic } from "./vehicule-public";

const JOURS_SCHEMA: Record<Horaire["jour"], string> = {
  Lundi: "Monday", Mardi: "Tuesday", Mercredi: "Wednesday", Jeudi: "Thursday", Vendredi: "Friday", Samedi: "Saturday", Dimanche: "Sunday",
};

const heure = (h: string, m?: string) => `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;

/**
 * « 9h – 12h, 14h30 - 19h » → [{ opens: "09:00", closes: "12:00" }, { opens: "14:30", closes: "19:00" }].
 * Texte libre non reconnu (« Sur rendez-vous ») → aucune plage.
 */
export function lirePlages(texte: string): { opens: string; closes: string }[] {
  const plages: { opens: string; closes: string }[] = [];
  for (const m of texte.matchAll(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:–|-|à|—)\s*(\d{1,2})\s*(?:h|:)\s*(\d{2})?/gi)) {
    const [debutH, debutM, finH, finM] = [m[1]!, m[2], m[3]!, m[4]];
    if (Number(debutH) > 23 || Number(finH) > 24) continue;
    plages.push({ opens: heure(debutH, debutM), closes: heure(finH, finM) });
  }
  return plages;
}

export function horairesSchema(horaires: Horaire[]) {
  return horaires
    .filter((h) => h.ouvert)
    .flatMap((h) => lirePlages(h.plages).map((p) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${JOURS_SCHEMA[h.jour]}`, ...p })));
}

/** Retire les clés vides (null, undefined, "", tableau vide) pour un JSON-LD propre. */
function nettoyer<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))) as T;
}

export function jsonLdConcession(r: ReglagesPublics, opts: { url: string; logo: string | null; image: string | null }) {
  return nettoyer({
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: r.nom,
    description: r.seoDescription ?? r.slogan,
    url: opts.url,
    logo: opts.logo,
    image: opts.image ?? opts.logo,
    telephone: r.telephone,
    email: r.email,
    address: r.adresse ? { "@type": "PostalAddress", streetAddress: r.adresse.replace(/\s*\n\s*/g, ", "), addressCountry: "FR" } : null,
    hasMap: r.lienGoogleMaps,
    openingHoursSpecification: horairesSchema(r.horaires),
    sameAs: Object.values(r.reseaux).filter(Boolean),
    paymentAccepted: r.moyensPaiement.length ? r.moyensPaiement.join(", ") : null,
  });
}

const DISPONIBILITE = { DISPONIBLE: "https://schema.org/InStock", RESERVE: "https://schema.org/LimitedAvailability", VENDU: "https://schema.org/SoldOut" } as const;
const CARBURANTS: Record<string, string> = { Essence: "Gasoline", Diesel: "Diesel", Électrique: "Electric", Hybride: "Hybrid", "Hybride rechargeable": "Plug-in hybrid", GPL: "LPG", "Superéthanol E85": "E85" };

export function jsonLdVoiture(v: VehiculePublic, opts: { url: string; images: string[]; vendeur: { nom: string; url: string } }) {
  const offre = nettoyer({
    "@type": "Offer",
    url: opts.url,
    priceCurrency: "EUR",
    // Prix en euros entiers (affiché sans centimes) ; absent si « prix sur demande » ou vendu
    price: v.prixCentimes !== null ? Math.round(v.prixCentimes / 100) : null,
    availability: DISPONIBILITE[v.disponibilite],
    itemCondition: "https://schema.org/UsedCondition",
    seller: { "@type": "AutoDealer", name: opts.vendeur.nom, url: opts.vendeur.url },
  });
  return nettoyer({
    "@context": "https://schema.org",
    "@type": "Car",
    name: v.titre,
    description: v.description ? v.description.replace(/\*\*/g, "").replace(/^\s*[-•*]\s+/gm, "").slice(0, 500) : null,
    url: opts.url,
    image: opts.images,
    brand: { "@type": "Brand", name: v.marque },
    model: v.modele,
    vehicleConfiguration: v.version,
    vehicleModelDate: v.annee ? String(v.annee) : null,
    dateVehicleFirstRegistered: v.miseEnCirculation,
    mileageFromOdometer: v.kilometrage !== null ? { "@type": "QuantitativeValue", value: v.kilometrage, unitCode: "KMT" } : null,
    fuelType: v.carburant ? (CARBURANTS[v.carburant] ?? v.carburant) : null,
    vehicleTransmission: v.boite,
    color: v.couleur,
    seatingCapacity: v.places,
    vehicleEngine: v.puissanceCh ? { "@type": "EngineSpecification", enginePower: { "@type": "QuantitativeValue", value: v.puissanceCh, unitCode: "BHP" } } : null,
    itemCondition: "https://schema.org/UsedCondition",
    offers: offre,
  });
}

/** JSON sûr dans une balise <script> (aucune fermeture de balise possible). */
export function serialiserJsonLd(donnees: unknown): string {
  return JSON.stringify(donnees).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
