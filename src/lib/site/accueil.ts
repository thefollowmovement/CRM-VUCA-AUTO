// Règles pures de l'accueil du site (S7) : boutons de budget, bandeau défilant, titre en deux temps.
import { PALIERS_PRIX } from "./filtres";

/** Titre par défaut de l'accueil (modifiable dans Site web → Contenu). */
export const TITRE_ACCUEIL_DEFAUT = "Petits prix. Grandes occasions.";

/**
 * Jusqu'à 3 boutons « Moins de X € » utiles : chaque palier doit contenir au moins une voiture
 * sans les contenir toutes. Répartis du plus petit au plus grand.
 */
export function budgetsAccueil(prixCentimes: (number | null)[], max = 3): number[] {
  const prix = prixCentimes.filter((p): p is number => p !== null && p > 0);
  if (prix.length < 2) return [];
  const utiles = PALIERS_PRIX.filter((palier) => {
    const n = prix.filter((p) => p <= palier * 100).length;
    return n > 0 && n < prix.length;
  });
  if (utiles.length <= max) return [...utiles];
  // Premier, dernier et paliers intermédiaires régulièrement espacés
  return Array.from({ length: max }, (_, i) => utiles[Math.round((i * (utiles.length - 1)) / (max - 1))]!);
}

/** Plus petit prix affiché (pastille « Dès … »), null s'il n'y en a pas. */
export function prixDepart(prixCentimes: (number | null)[]): number | null {
  const prix = prixCentimes.filter((p): p is number => p !== null && p > 0);
  return prix.length ? Math.min(...prix) : null;
}

/**
 * Phrases du bandeau qui défile : uniquement des faits (prix affichés : toujours vrai sur le site ;
 * engagements cochés dans le CRM ; délai de réponse saisi). Au moins 3 éléments (répétés si besoin).
 */
export function elementsBandeau(engagements: { titre: string }[], delaiReponse: string | null): string[] {
  const elements = ["Prix affichés, sans surprise", ...engagements.map((e) => e.titre), ...(delaiReponse ? [delaiReponse] : [])];
  const uniques = [...new Set(elements.map((e) => e.trim()).filter(Boolean))];
  while (uniques.length < 3) uniques.push(...uniques.slice(0, 3 - uniques.length));
  return uniques;
}

/** « Petits prix. Grandes occasions. » → ["Petits prix.", "Grandes occasions."] (la 2e partie en couleur). */
export function decouperTitre(titre: string): [string, string | null] {
  const m = /^(.+?[.!?])\s+(.+)$/.exec(titre.trim());
  return m ? [m[1]!, m[2]!] : [titre.trim(), null];
}
