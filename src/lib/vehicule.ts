// =====================================================================
//  Référentiels et règles de saisie des véhicules (libellés en français).
// =====================================================================
import type {
  Boite,
  Carburant,
  CritAir,
  Provenance,
  StatutVehicule,
  TypeExploitation,
} from "@/generated/prisma/enums";

export const LIBELLES_STATUT: Record<StatutVehicule, string> = {
  EN_PREPARATION: "En préparation",
  EN_VENTE: "En vente",
  RESERVE: "Réservé",
  DISPONIBLE_LOCATION: "Disponible à la location",
  EN_LOCATION: "En location",
  IMMOBILISE: "Immobilisé",
  VENDU: "Vendu",
  ARCHIVE: "Archivé",
};

/** Couleur de pastille par statut (classes Tailwind). */
export const COULEURS_STATUT: Record<StatutVehicule, string> = {
  EN_PREPARATION: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  EN_VENTE: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  RESERVE: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  DISPONIBLE_LOCATION: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  EN_LOCATION: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  IMMOBILISE: "bg-red-500/15 text-red-700 dark:text-red-400",
  VENDU: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  ARCHIVE: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

/**
 * Statuts que l'utilisateur peut choisir à la main.
 * VENDU passe par « Marquer comme vendu » (Phase 3), EN_LOCATION par les
 * contrats (Phase 4), ARCHIVE par le bouton « Archiver ».
 */
export const STATUTS_MANUELS: StatutVehicule[] = [
  "EN_PREPARATION",
  "EN_VENTE",
  "RESERVE",
  "DISPONIBLE_LOCATION",
  "IMMOBILISE",
];

export const LIBELLES_TYPE: Record<TypeExploitation, string> = {
  ACHAT_REVENTE: "Achat-revente",
  LOCATION: "Location",
  MIXTE: "Mixte (location puis revente)",
};

export const LIBELLES_CARBURANT: Record<Carburant, string> = {
  ESSENCE: "Essence",
  DIESEL: "Diesel",
  HYBRIDE: "Hybride",
  HYBRIDE_RECHARGEABLE: "Hybride rechargeable",
  ELECTRIQUE: "Électrique",
  GPL: "GPL",
  E85: "Superéthanol E85",
  AUTRE: "Autre",
};

export const LIBELLES_BOITE: Record<Boite, string> = { MANUELLE: "Manuelle", AUTOMATIQUE: "Automatique" };

export const LIBELLES_CRITAIR: Record<CritAir, string> = {
  CRIT_AIR_0: "Crit'Air 0 (vert)",
  CRIT_AIR_1: "Crit'Air 1",
  CRIT_AIR_2: "Crit'Air 2",
  CRIT_AIR_3: "Crit'Air 3",
  CRIT_AIR_4: "Crit'Air 4",
  CRIT_AIR_5: "Crit'Air 5",
  NON_CLASSE: "Non classé",
};

export const LIBELLES_PROVENANCE: Record<Provenance, string> = {
  PARTICULIER: "Particulier",
  PROFESSIONNEL: "Professionnel",
  ENCHERES: "Enchères",
  IMPORT: "Import",
  REPRISE: "Reprise",
  AUTRE: "Autre",
};

// ---------------------------------------------------------------------
//  Immatriculation
// ---------------------------------------------------------------------

/** SIV (depuis 2009) : AA-123-AA (lettres I, O, U interdites ; SS en tête, WW réservé au garage). */
const MOTIF_SIV = /^([A-HJ-NP-TV-Z]{2})-?(\d{3})-?([A-HJ-NP-TV-Z]{2})$/;
/** FNI (ancien format) : 1234 AB 56, 123 ABC 2A… */
const MOTIF_FNI = /^(\d{1,4})\s*([A-Z]{1,3})\s*(\d{2}|2A|2B|97\d)$/;

/**
 * Met une immatriculation au format standard, ou renvoie null si elle n'est
 * ni au format SIV ni au format FNI.
 *   « ab123cd », « AB 123 CD », « ab-123-cd » → « AB-123-CD »
 *   « 1234ab56 » → « 1234 AB 56 »
 */
export function normaliserImmatriculation(saisie: string): string | null {
  const s = saisie.toUpperCase().replace(/[\s.]+/g, " ").trim();
  const compact = s.replace(/[\s-]/g, "");
  const siv = compact.match(MOTIF_SIV);
  if (siv) return `${siv[1]}-${siv[2]}-${siv[3]}`;
  const fni = s.replace(/-/g, " ").match(MOTIF_FNI);
  if (fni) return `${fni[1]} ${fni[2]} ${fni[3]}`;
  return null;
}

/** VIN : 17 caractères, sans I, O ni Q. Renvoie la version en majuscules ou null. */
export function normaliserVin(saisie: string): string | null {
  const v = saisie.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v) ? v : null;
}

/** Titre court d'un véhicule : « Peugeot 208 Allure ». */
export function nomVehicule(v: { marque: string; modele: string; version?: string | null }): string {
  return [v.marque, v.modele, v.version].filter(Boolean).join(" ");
}
