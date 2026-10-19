// =====================================================================
//  Rentabilité d'un véhicule (section 5.1 ; revenus de location pour les
//  véhicules mixtes ou de location, section 5.4).
// =====================================================================
import { diviserArrondi } from "./repartition";

export type EntreeRentabilite = {
  prixAchatCentimes: number;
  totalDepensesCentimes: number;
  /** Prix de vente réel (véhicule vendu). */
  prixVenteCentimes: number | null;
  /** Revenus de location encaissés + indemnités d'assurance. */
  autresRevenusCentimes: number;
  /** Référence prévisionnelle si non vendu : prix cible, sinon valeur estimée. */
  prixCibleCentimes: number | null;
  valeurEstimeeCentimes: number | null;
};

export type Rentabilite = {
  coutDeRevientCentimes: number;
  /** Prix de vente utilisé (réel ou prévisionnel), null si aucune référence. */
  prixVenteRetenuCentimes: number | null;
  revenusCentimes: number;
  beneficeCentimes: number | null;
  /** Marge % = bénéfice / prix de vente, en points de base. */
  margeBp: number | null;
  /** ROI % = bénéfice / coût de revient, en points de base. */
  roiBp: number | null;
  /** true si basé sur un prix cible / une valeur estimée (véhicule non vendu). */
  previsionnel: boolean;
  /** D'où vient le prix retenu. */
  source: "vente" | "prixCible" | "valeurEstimee" | "aucune";
};

export function calculerRentabilite(e: EntreeRentabilite): Rentabilite {
  const cout = e.prixAchatCentimes + e.totalDepensesCentimes;
  let prix: number | null;
  let source: Rentabilite["source"];
  if (e.prixVenteCentimes !== null) {
    prix = e.prixVenteCentimes;
    source = "vente";
  } else if (e.prixCibleCentimes !== null) {
    prix = e.prixCibleCentimes;
    source = "prixCible";
  } else if (e.valeurEstimeeCentimes !== null) {
    prix = e.valeurEstimeeCentimes;
    source = "valeurEstimee";
  } else {
    prix = null;
    source = "aucune";
  }

  // Sans prix de vente de référence, le bénéfice n'est calculable que s'il y a des revenus de location.
  const revenus = (prix ?? 0) + e.autresRevenusCentimes;
  const calculable = prix !== null || e.autresRevenusCentimes > 0;
  const benefice = calculable ? revenus - cout : null;

  return {
    coutDeRevientCentimes: cout,
    prixVenteRetenuCentimes: prix,
    revenusCentimes: revenus,
    beneficeCentimes: benefice,
    margeBp: benefice !== null && prix ? diviserArrondi(benefice * 10000, prix) : null,
    roiBp: benefice !== null && cout > 0 ? diviserArrondi(benefice * 10000, cout) : null,
    previsionnel: source !== "vente",
    source,
  };
}
