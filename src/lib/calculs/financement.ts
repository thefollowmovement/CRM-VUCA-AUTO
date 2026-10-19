// =====================================================================
//  Financement de l'achat d'un véhicule (section 3.4 du cahier des charges).
//  La somme des participations doit égaler le prix d'achat, sauf écart
//  explicitement accepté par l'utilisateur.
// =====================================================================
import { pourcentagesBp, somme } from "./argent";

export type LigneFinancement = { partenaireId: string; montantCentimes: number };

export type ResumeFinancement = {
  totalCentimes: number;
  /** Prix d'achat − total financé (positif : il manque ; négatif : trop financé). */
  resteCentimes: number;
  etat: "complet" | "incomplet" | "depasse";
  /** Part de chacun dans le total financé, en points de base (somme = 10000). */
  pourcentagesBp: number[];
};

export function resumerFinancement(prixAchatCentimes: number, lignes: LigneFinancement[]): ResumeFinancement {
  const montants = lignes.map((l) => l.montantCentimes);
  const totalCentimes = somme(montants);
  const resteCentimes = prixAchatCentimes - totalCentimes;
  return {
    totalCentimes,
    resteCentimes,
    etat: resteCentimes === 0 ? "complet" : resteCentimes > 0 ? "incomplet" : "depasse",
    pourcentagesBp: totalCentimes > 0 ? pourcentagesBp(montants) : montants.map(() => 0),
  };
}

/** Partenaires présents plusieurs fois dans les lignes (interdit : une ligne par partenaire). */
export function partenairesEnDouble(lignes: LigneFinancement[]): string[] {
  const vus = new Set<string>();
  const doubles = new Set<string>();
  for (const l of lignes) {
    if (vus.has(l.partenaireId)) doubles.add(l.partenaireId);
    vus.add(l.partenaireId);
  }
  return [...doubles];
}
