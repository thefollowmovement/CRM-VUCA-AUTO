// =====================================================================
//  Comparaison automatique état des lieux départ / retour (section 3.6)
//  → km parcourus, km supplémentaires, carburant manquant, retard,
//    nettoyage, nouveaux dommages, éléments manquants, et FRAIS PROPOSÉS
//    (l'utilisateur les valide ou les modifie).
// =====================================================================
import { MS_PAR_MINUTE } from "@/lib/dates";
import { joursFactures, kmInclusTotal, type TypeLocation } from "./location";
import { diviserArrondi } from "./repartition";

export type Proprete = "PROPRE" | "CORRECT" | "SALE";
export type TypeFrais = "KM_SUPPLEMENTAIRES" | "CARBURANT" | "NETTOYAGE" | "DOMMAGES" | "RETARD" | "LIVRAISON" | "AMENDE_REFACTUREE" | "FRAIS_GESTION_AMENDE" | "FRAIS_DOSSIER" | "AUTRE";

export type ReleveEdl = {
  kilometrage: number;
  niveauCarburantHuitiemes: number | null;
  niveauBatteriePct: number | null;
  propreteInterieure: Proprete | null;
  propreteExterieure: Proprete | null;
  checklist: { libelle: string; present: boolean; quantite: number | null }[];
};

export type ContratComparaison = {
  type: TypeLocation;
  tarifCentimes: number;
  tarifJournalierCentimes: number | null;
  dureeFacturee: number;
  joursSupplementaires: number;
  kilometrageIllimite: boolean;
  kmInclusParUnite: number | null;
  prixKmSupCentimes: number | null;
  departPrevuLe: Date;
  retourPrevuLe: Date;
};

export type ReglagesFrais = {
  toleranceRetardMinutes: number;
  fraisNettoyageCentimes: number;
  prixHuitiemeCarburantCentimes: number;
  prixPourcentBatterieCentimes: number;
};

export type FraisPropose = {
  type: TypeFrais;
  libelle: string;
  quantite: number;
  prixUnitaireCentimes: number;
  montantCentimes: number;
  dommageId?: string;
};

export type Comparaison = {
  kmParcourus: number;
  kmInclus: number | null;
  kmSupplementaires: number;
  carburantManquantHuitiemes: number;
  batterieManquantePct: number;
  retardMinutes: number;
  joursRetard: number;
  tarifJournalierRetardCentimes: number;
  salete: boolean;
  elementsManquants: string[];
  nouveauxDommages: { id: string; libelle: string }[];
  fraisProposes: FraisPropose[];
};

const RANG_PROPRETE: Record<Proprete, number> = { PROPRE: 0, CORRECT: 1, SALE: 2 };

/** Le véhicule revient-il plus sale ? (rendu « sale » alors qu'il ne l'était pas au départ) */
function plusSale(depart: Proprete | null, retour: Proprete | null) {
  return retour === "SALE" && (depart === null || RANG_PROPRETE[depart] < RANG_PROPRETE.SALE);
}

/** Prix d'une journée de retard : tarif journalier, sinon tarif hebdo ÷ 7 ou mensuel ÷ 30. */
export function tarifJournalierRetard(c: Pick<ContratComparaison, "type" | "tarifCentimes" | "tarifJournalierCentimes">): number {
  if (c.tarifJournalierCentimes != null) return c.tarifJournalierCentimes;
  if (c.type === "JOURNALIERE") return c.tarifCentimes;
  return diviserArrondi(c.tarifCentimes, c.type === "HEBDOMADAIRE" ? 7 : 30);
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function comparerEtatsDesLieux(params: {
  contrat: ContratComparaison;
  depart: ReleveEdl;
  retour: ReleveEdl;
  retourReelLe: Date;
  reglages: ReglagesFrais;
  nouveauxDommages: { id: string; libelle: string }[];
}): Comparaison {
  const { contrat: c, depart: d, retour: r, reglages: g } = params;
  const frais: FraisPropose[] = [];
  const ligne = (type: TypeFrais, libelle: string, quantite: number, prix: number, dommageId?: string) =>
    frais.push({ type, libelle, quantite, prixUnitaireCentimes: prix, montantCentimes: quantite * prix, ...(dommageId ? { dommageId } : {}) });

  // 1. Kilomètres (km inclus = durée facturée prévue au contrat)
  const kmParcourus = Math.max(0, r.kilometrage - d.kilometrage);
  const joursTotal = joursFactures(c.departPrevuLe, c.retourPrevuLe, g.toleranceRetardMinutes);
  const kmInclus = c.kilometrageIllimite
    ? null
    : kmInclusTotal(c.type, c.kmInclusParUnite, { unites: c.dureeFacturee, joursSupplementaires: c.joursSupplementaires, joursTotal });
  const kmSupplementaires = kmInclus === null ? 0 : Math.max(0, kmParcourus - kmInclus);
  if (kmSupplementaires > 0 && c.prixKmSupCentimes) ligne("KM_SUPPLEMENTAIRES", `Kilomètres supplémentaires (${kmSupplementaires} km)`, kmSupplementaires, c.prixKmSupCentimes);

  // 2. Carburant ou batterie manquant
  const carburantManquantHuitiemes =
    d.niveauCarburantHuitiemes != null && r.niveauCarburantHuitiemes != null ? Math.max(0, d.niveauCarburantHuitiemes - r.niveauCarburantHuitiemes) : 0;
  if (carburantManquantHuitiemes > 0) ligne("CARBURANT", `Carburant manquant (${carburantManquantHuitiemes}/8)`, carburantManquantHuitiemes, g.prixHuitiemeCarburantCentimes);
  const batterieManquantePct = d.niveauBatteriePct != null && r.niveauBatteriePct != null ? Math.max(0, d.niveauBatteriePct - r.niveauBatteriePct) : 0;
  if (batterieManquantePct > 0) ligne("CARBURANT", `Recharge de la batterie (${batterieManquantePct} %)`, batterieManquantePct, g.prixPourcentBatterieCentimes);

  // 3. Retard (au-delà de la tolérance, toute journée entamée est due)
  const retardMinutes = Math.max(0, Math.round((params.retourReelLe.getTime() - c.retourPrevuLe.getTime()) / MS_PAR_MINUTE));
  const joursRetard = retardMinutes > g.toleranceRetardMinutes ? Math.ceil((retardMinutes - g.toleranceRetardMinutes) / (24 * 60)) : 0;
  const tarifRetard = tarifJournalierRetard(c);
  if (joursRetard > 0) ligne("RETARD", `Retard (${pluriel(joursRetard, "jour")})`, joursRetard, tarifRetard);

  // 4. Nettoyage
  const salete = plusSale(d.propreteInterieure, r.propreteInterieure) || plusSale(d.propreteExterieure, r.propreteExterieure);
  if (salete) ligne("NETTOYAGE", "Nettoyage", 1, g.fraisNettoyageCentimes);

  // 5. Nouveaux dommages : montant à saisir (devis, franchise…)
  for (const dm of params.nouveauxDommages) ligne("DOMMAGES", `Dommage : ${dm.libelle}`, 1, 0, dm.id);

  // 6. Éléments de la check-list manquants au retour
  const elementsManquants: string[] = [];
  for (const e of d.checklist) {
    if (!e.present) continue;
    const auRetour = r.checklist.find((x) => x.libelle === e.libelle);
    if (!auRetour || !auRetour.present) elementsManquants.push(e.libelle);
    else if (e.quantite != null && auRetour.quantite != null && auRetour.quantite < e.quantite) elementsManquants.push(`${e.libelle} (${auRetour.quantite} sur ${e.quantite})`);
  }
  for (const e of elementsManquants) ligne("AUTRE", `Élément manquant : ${e}`, 1, 0);

  return {
    kmParcourus,
    kmInclus,
    kmSupplementaires,
    carburantManquantHuitiemes,
    batterieManquantePct,
    retardMinutes,
    joursRetard,
    tarifJournalierRetardCentimes: tarifRetard,
    salete,
    elementsManquants,
    nouveauxDommages: params.nouveauxDommages,
    fraisProposes: frais,
  };
}

/** Caution : montant retenu selon la décision (jamais plus que la caution). */
export function montantRetenu(caution: number, decision: "RESTITUEE" | "RETENUE_PARTIELLE" | "RETENUE_TOTALE", partiel: number | null): number {
  if (decision === "RESTITUEE") return 0;
  if (decision === "RETENUE_TOTALE") return caution;
  return Math.min(caution, Math.max(0, partiel ?? 0));
}
