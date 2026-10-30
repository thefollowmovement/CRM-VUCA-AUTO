// « Véhicules similaires » sur une fiche : même gamme de prix d'abord, puis même carburant / marque.

type Comparable = { slug: string; marque: string; carburant: string | null; prixCentimes: number | null };

/** Les `n` véhicules les plus proches (hors celui de la fiche). */
export function vehiculesSimilaires<T extends Comparable>(reference: Comparable, liste: T[], n = 3): T[] {
  const prix = reference.prixCentimes;
  const score = (v: T) => {
    let s = 0;
    if (prix !== null && v.prixCentimes !== null) s += Math.min(1, Math.abs(v.prixCentimes - prix) / prix) * 10; // écart relatif de prix
    else s += 5;
    if (reference.carburant && v.carburant !== reference.carburant) s += 2;
    if (v.marque !== reference.marque) s += 1;
    return s;
  };
  return liste
    .filter((v) => v.slug !== reference.slug)
    .map((v, i) => ({ v, s: score(v), i }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.v);
}
