// =====================================================================
//  Indicateurs simples d'un véhicule (section 5.1).
//  Le moteur complet (bénéfice, répartition) arrive en Phase 3.
// =====================================================================

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/** Coût de revient = prix d'achat + somme des dépenses. */
export function coutDeRevient(prixAchatCentimes: number, totalDepensesCentimes: number): number {
  return prixAchatCentimes + totalDepensesCentimes;
}

/**
 * Jours en stock = date de vente (ou aujourd'hui) − date d'achat.
 * Les dates calendaires sont comparées en jours entiers (UTC minuit).
 */
export function joursEnStock(dateAchat: Date, dateVente: Date | null, aujourdhui = new Date()): number {
  const fin = dateVente ?? aujourdhui;
  const debutJour = Date.UTC(dateAchat.getUTCFullYear(), dateAchat.getUTCMonth(), dateAchat.getUTCDate());
  const finJour = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate());
  return Math.max(0, Math.round((finJour - debutJour) / MS_PAR_JOUR));
}

/**
 * Marge prévisionnelle d'un véhicule non vendu : prix cible (sinon valeur
 * estimée) − coût de revient. null si aucune référence de prix.
 */
export function margePrevisionnelle(
  coutDeRevientCentimes: number,
  prixCibleCentimes: number | null,
  valeurEstimeeCentimes: number | null,
): number | null {
  const reference = prixCibleCentimes ?? valeurEstimeeCentimes;
  return reference === null ? null : reference - coutDeRevientCentimes;
}
