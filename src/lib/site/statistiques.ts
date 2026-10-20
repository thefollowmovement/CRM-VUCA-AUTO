// Statistiques du site : agrégation des compteurs journaliers (pur, testé).
// Une ligne = (jour, type, annonce, compte). Les jours sont des dates calendaires « AAAA-MM-JJ ».

export const TYPES_STAT = ["VUE_SITE", "VUE_ANNONCE", "CLIC_WHATSAPP", "CLIC_APPEL"] as const;
export type TypeStat = (typeof TYPES_STAT)[number];
export type LigneStat = { jour: string; type: TypeStat; annonceId: string | null; compte: number };
export type Totaux = Record<TypeStat, number>;
export type PointJour = Totaux & { jour: string };

export const PERIODES_STAT = [7, 30, 90] as const;
export type PeriodeStat = (typeof PERIODES_STAT)[number];
export const lirePeriodeStat = (v: string | string[] | undefined): PeriodeStat => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return (PERIODES_STAT as readonly number[]).includes(n) ? (n as PeriodeStat) : 30;
};

const vide = (): Totaux => ({ VUE_SITE: 0, VUE_ANNONCE: 0, CLIC_WHATSAPP: 0, CLIC_APPEL: 0 });

/** Jour calendaire décalé de n jours (« 2026-10-20 » − 1 → « 2026-10-19 »). */
export function decalerJour(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Les `n` derniers jours jusqu'à `fin` inclus, du plus ancien au plus récent. */
export function joursPeriode(fin: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => decalerJour(fin, i - n + 1));
}

/** Taux de contact = clics (WhatsApp + Appeler) / vues d'annonces, en % arrondi (null sans vue). */
export function tauxContact(clics: number, vues: number): number | null {
  return vues > 0 ? Math.round((clics / vues) * 1000) / 10 : null;
}

/** Évolution en % par rapport à la période précédente (null si rien avant). */
export function evolution(actuel: number, precedent: number): number | null {
  return precedent > 0 ? Math.round(((actuel - precedent) / precedent) * 100) : null;
}

export function agregerStatistiques(lignes: LigneStat[], fin: string, nbJours: number) {
  const jours = joursPeriode(fin, nbJours);
  const debut = jours[0]!;
  const debutPrecedent = decalerJour(debut, -nbJours);
  const parJour = new Map(jours.map((j) => [j, vide()]));
  const totaux = vide();
  const precedents = vide();
  const parAnnonce = new Map<string, Totaux>();
  for (const l of lignes) {
    if (l.jour >= debut && l.jour <= fin) {
      parJour.get(l.jour)![l.type] += l.compte;
      totaux[l.type] += l.compte;
      if (l.annonceId) {
        const a = parAnnonce.get(l.annonceId) ?? vide();
        a[l.type] += l.compte;
        parAnnonce.set(l.annonceId, a);
      }
    } else if (l.jour >= debutPrecedent && l.jour < debut) {
      precedents[l.type] += l.compte;
    }
  }
  return {
    jours: jours.map((j): PointJour => ({ jour: j, ...parJour.get(j)! })),
    totaux,
    precedents,
    parAnnonce,
  };
}
