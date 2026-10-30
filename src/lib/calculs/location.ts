// =====================================================================
//  Prix d'une location (section 5.5 + précisions validées en Phase 0)
//
//   - Journalière : toute journée de 24 h entamée est due, avec une
//     tolérance (ex. 60 min) avant de compter une journée de plus.
//   - Hebdomadaire : semaines entières × tarif hebdo + jours restants ×
//     tarif journalier, plafonné au prix d'une semaine de plus
//     (10 jours = 1 semaine + 3 jours, jamais plus que 2 semaines).
//   - Mensuelle : mois « date à date » ; le dernier mois entamé est
//     facturé au prorata : tarif mensuel ÷ 30 × jours.
//   - Prix = tarif × durée − remise + options + frais de livraison.
//   - Km supplémentaires = max(0, km parcourus − km inclus) × prix du km.
// =====================================================================
import { ajouterMoisParis, MS_PAR_JOUR, MS_PAR_MINUTE } from "@/lib/dates";
import { diviserArrondi } from "./repartition";

export type TypeLocation = "JOURNALIERE" | "HEBDOMADAIRE" | "MENSUELLE";

/** Nombre de journées de 24 h facturées (au moins 1). */
export function joursFactures(depart: Date, retour: Date, toleranceMinutes: number): number {
  const duree = retour.getTime() - depart.getTime() - toleranceMinutes * MS_PAR_MINUTE;
  return Math.max(1, Math.ceil(duree / MS_PAR_JOUR));
}

export type Duree = {
  /** Unités du type : jours, semaines ou mois. */
  unites: number;
  /** Jours en plus des unités (reste hebdomadaire, prorata mensuel). */
  joursSupplementaires: number;
  /** Durée totale en journées facturées (options par jour, km inclus). */
  joursTotal: number;
};

export function decomposerDuree(type: TypeLocation, depart: Date, retour: Date, toleranceMinutes: number): Duree {
  const joursTotal = joursFactures(depart, retour, toleranceMinutes);
  if (type === "JOURNALIERE") return { unites: joursTotal, joursSupplementaires: 0, joursTotal };
  if (type === "HEBDOMADAIRE") return { unites: Math.floor(joursTotal / 7), joursSupplementaires: joursTotal % 7, joursTotal };

  // Mensuelle : nombre de mois entiers « date à date », puis jours restants
  const limite = retour.getTime() + toleranceMinutes * MS_PAR_MINUTE;
  let mois = 0;
  while (ajouterMoisParis(depart, mois + 1).getTime() <= limite) mois++;
  const finMois = ajouterMoisParis(depart, mois);
  const reste = retour.getTime() > finMois.getTime() + toleranceMinutes * MS_PAR_MINUTE ? joursFactures(finMois, retour, toleranceMinutes) : 0;
  return { unites: mois, joursSupplementaires: reste, joursTotal };
}

export type OptionPrix = {
  modeTarif: "PAR_JOUR" | "FORFAIT";
  prixCentimes: number;
  quantite: number;
  /** Plafond par unité de quantité (ex. siège bébé plafonné à 50 €). */
  plafondCentimes?: number | null;
};

export type EntreePrix = {
  type: TypeLocation;
  depart: Date;
  retour: Date;
  toleranceMinutes: number;
  /** Prix d'une unité du type : jour, semaine ou mois. */
  tarifCentimes: number;
  /** Tarif journalier (hebdomadaire : jours restants). */
  tarifJournalierCentimes?: number | null;
  remiseCentimes?: number;
  fraisLivraisonCentimes?: number;
  options?: OptionPrix[];
};

export type Prix = Duree & {
  montantBaseCentimes: number;
  /** Hebdomadaire : le plafond « une semaine de plus » s'applique. */
  plafondHebdoApplique: boolean;
  totalOptions: number[];
  totalOptionsCentimes: number;
  remiseCentimes: number;
  fraisLivraisonCentimes: number;
  prixTotalCentimes: number;
};

/** Total d'une option : par jour (plafonné) ou forfait, × quantité. */
export function totalOption(o: OptionPrix, joursTotal: number): number {
  const parUnite = o.modeTarif === "PAR_JOUR" ? o.prixCentimes * joursTotal : o.prixCentimes;
  const plafonne = o.plafondCentimes != null ? Math.min(parUnite, o.plafondCentimes) : parUnite;
  return plafonne * Math.max(1, o.quantite);
}

export function calculerPrixLocation(e: EntreePrix): Prix {
  let duree = decomposerDuree(e.type, e.depart, e.retour, e.toleranceMinutes);
  let base: number;
  let plafondHebdoApplique = false;

  if (e.type === "JOURNALIERE") {
    base = e.tarifCentimes * duree.unites;
  } else if (e.type === "HEBDOMADAIRE") {
    const r = duree.joursSupplementaires;
    // Sans tarif journalier : jours restants au prorata du tarif hebdomadaire
    const prixJours = e.tarifJournalierCentimes != null ? e.tarifJournalierCentimes * r : diviserArrondi(e.tarifCentimes * r, 7);
    base = e.tarifCentimes * duree.unites + prixJours;
    const plafond = e.tarifCentimes * (duree.unites + 1);
    if (r > 0 && base > plafond) {
      base = plafond;
      plafondHebdoApplique = true;
      duree = { ...duree, unites: duree.unites + 1, joursSupplementaires: 0 };
    }
  } else {
    base = e.tarifCentimes * duree.unites + diviserArrondi(e.tarifCentimes * duree.joursSupplementaires, 30);
  }

  const totalOptions = (e.options ?? []).map((o) => totalOption(o, duree.joursTotal));
  const totalOptionsCentimes = totalOptions.reduce((a, b) => a + b, 0);
  const remise = e.remiseCentimes ?? 0;
  const livraison = e.fraisLivraisonCentimes ?? 0;
  return {
    ...duree,
    montantBaseCentimes: base,
    plafondHebdoApplique,
    totalOptions,
    totalOptionsCentimes,
    remiseCentimes: remise,
    fraisLivraisonCentimes: livraison,
    prixTotalCentimes: base - remise + totalOptionsCentimes + livraison,
  };
}

/** Km inclus sur la durée : par jour (courte durée) ou par mois (mensuelle, dernier mois au prorata). */
export function kmInclusTotal(type: TypeLocation, kmParUnite: number | null, duree: Duree): number | null {
  if (kmParUnite === null) return null;
  if (type === "MENSUELLE") return kmParUnite * duree.unites + Math.round((kmParUnite * duree.joursSupplementaires) / 30);
  return kmParUnite * duree.joursTotal;
}

/** Montant des km supplémentaires. */
export function montantKmSupplementaires(kmParcourus: number, kmInclus: number | null, prixKmSupCentimes: number | null): { kmSup: number; montantCentimes: number } {
  if (kmInclus === null || !prixKmSupCentimes) return { kmSup: 0, montantCentimes: 0 };
  const kmSup = Math.max(0, kmParcourus - kmInclus);
  return { kmSup, montantCentimes: kmSup * prixKmSupCentimes };
}

/** Deux périodes [début, fin[ se chevauchent-elles ? */
export function chevauche(debutA: Date, finA: Date, debutB: Date, finB: Date): boolean {
  return debutA.getTime() < finB.getTime() && debutB.getTime() < finA.getTime();
}

/**
 * Taux d'occupation (section 5.4), en points de base :
 * jours loués / jours disponibles depuis la mise en location (jours immobilisés exclus).
 * Les périodes sont fusionnées : deux contrats qui se touchent ne comptent pas double.
 */
export function tauxOccupation(params: {
  debut: Date;
  fin: Date;
  locations: { debut: Date; fin: Date }[];
  immobilisations: { debut: Date; fin: Date }[];
}): { joursLoues: number; joursDisponibles: number; tauxBp: number | null } {
  const { debut, fin } = params;
  const duree = (periodes: { debut: Date; fin: Date }[]) => {
    const coupees = periodes
      .map((p) => [Math.max(p.debut.getTime(), debut.getTime()), Math.min(p.fin.getTime(), fin.getTime())] as const)
      .filter(([a, b]) => b > a)
      .sort((x, y) => x[0] - y[0]);
    let total = 0;
    let courant: [number, number] | null = null;
    for (const [a, b] of coupees) {
      if (courant && a <= courant[1]) courant[1] = Math.max(courant[1], b);
      else {
        if (courant) total += courant[1] - courant[0];
        courant = [a, b];
      }
    }
    if (courant) total += courant[1] - courant[0];
    return total;
  };
  const total = Math.max(0, fin.getTime() - debut.getTime());
  const immobilise = duree(params.immobilisations);
  const loue = duree(params.locations);
  const disponible = total - immobilise;
  return {
    joursLoues: Math.round(loue / MS_PAR_JOUR),
    joursDisponibles: Math.round(disponible / MS_PAR_JOUR),
    tauxBp: disponible > 0 ? Math.min(10000, Math.round((loue / disponible) * 10000)) : null,
  };
}
