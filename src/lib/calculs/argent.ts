// =====================================================================
//  Outils de calcul sur les montants (toujours en centimes, entiers).
// =====================================================================

/**
 * Répartit un total entier proportionnellement à des poids, sans perte :
 * la somme des parts est EXACTEMENT égale au total (méthode du plus fort
 * reste). Ex. 100 réparti en [1, 1, 1] → [34, 33, 33].
 */
export function repartirProportionnellement(total: number, poids: number[]): number[] {
  if (!Number.isInteger(total)) throw new Error("Le total doit être un entier (centimes).");
  const somme = poids.reduce((a, b) => a + b, 0);
  if (poids.length === 0) return [];
  if (somme === 0) return poids.map(() => 0);

  const signe = total < 0 ? -1 : 1;
  const absTotal = Math.abs(total);
  const brutes = poids.map((p) => (absTotal * p) / somme);
  const parts = brutes.map(Math.floor);
  let reste = absTotal - parts.reduce((a, b) => a + b, 0);

  // Les centimes restants vont aux plus grandes parties décimales.
  const ordre = brutes
    .map((b, i) => ({ i, decimale: b - Math.floor(b) }))
    .sort((a, b) => b.decimale - a.decimale || a.i - b.i);
  for (const { i } of ordre) {
    if (reste <= 0) break;
    parts[i]! += 1;
    reste -= 1;
  }
  return parts.map((p) => p * signe);
}

/** Pourcentages en points de base (total 10000) proportionnels aux montants. */
export function pourcentagesBp(montants: number[]): number[] {
  return repartirProportionnellement(10000, montants);
}

/** Somme d'une liste de montants. */
export function somme(montants: number[]): number {
  return montants.reduce((a, b) => a + b, 0);
}
