// =====================================================================
//  Résultat d'une période (dashboard, rapports, relevés investisseurs).
//
//  Pour qu'aucun euro ne soit compté deux fois, chaque dépense va dans un
//  seul « panier » :
//   - véhicule ACHAT_REVENTE : ses dépenses entrent dans le coût de revient
//     et sont comptées le jour de la VENTE (bénéfice vente = prix de vente
//     − prix d'achat − Σ dépenses) ;
//   - véhicule LOCATION ou MIXTE : ses dépenses sont des charges comptées
//     à leur DATE (résultat location = revenus encaissés − charges), et la
//     vente rapporte prix de vente − prix d'achat (valeur résiduelle, 5.4).
//  Sur toute la vie du véhicule, la somme des périodes redonne exactement
//  le bénéfice des sections 5.1 / 5.4.
//
//  Dates au format ISO « AAAA-MM-JJ » (jour de Paris), bornes incluses.
// =====================================================================

export type Mouvement = { date: string; montantCentimes: number };

export type VehiculePeriode = {
  typeExploitation: "ACHAT_REVENTE" | "LOCATION" | "MIXTE";
  prixAchatCentimes: number;
  /** Prix et date de vente (véhicule vendu), sinon null. */
  prixVenteCentimes: number | null;
  dateVente: string | null;
  depenses: Mouvement[];
  /** Encaissements de location (remboursements en négatif) + indemnités d'assurance. */
  revenus: Mouvement[];
};

export type ResultatPeriode = {
  /** Vendu pendant la période ? */
  vendu: boolean;
  caVenteCentimes: number;
  beneficeVenteCentimes: number;
  revenusLocationCentimes: number;
  chargesLocationCentimes: number;
  resultatLocationCentimes: number;
  /** Bénéfice net de la période = bénéfice vente + résultat location. */
  totalCentimes: number;
};

const dans = (date: string, du: string, au: string) => date >= du && date <= au;
const somme = (m: Mouvement[], du: string, au: string) => m.reduce((a, x) => (dans(x.date, du, au) ? a + x.montantCentimes : a), 0);

export function resultatPeriode(v: VehiculePeriode, du: string, au: string): ResultatPeriode {
  const vendu = v.prixVenteCentimes !== null && v.dateVente !== null && dans(v.dateVente, du, au);
  const reventePure = v.typeExploitation === "ACHAT_REVENTE";
  const toutesDepenses = v.depenses.reduce((a, d) => a + d.montantCentimes, 0);
  const caVente = vendu ? v.prixVenteCentimes! : 0;
  const beneficeVente = vendu ? caVente - v.prixAchatCentimes - (reventePure ? toutesDepenses : 0) : 0;
  const revenus = somme(v.revenus, du, au);
  const charges = reventePure ? 0 : somme(v.depenses, du, au);
  return {
    vendu,
    caVenteCentimes: caVente,
    beneficeVenteCentimes: beneficeVente,
    revenusLocationCentimes: revenus,
    chargesLocationCentimes: charges,
    resultatLocationCentimes: revenus - charges,
    totalCentimes: beneficeVente + revenus - charges,
  };
}

// ---------------------------------------------------------------------
//  Périodes
// ---------------------------------------------------------------------

export const PERIODES = ["mois", "mois-dernier", "trimestre", "annee", "perso"] as const;
export type TypePeriode = (typeof PERIODES)[number];
export const LIBELLES_PERIODE: Record<TypePeriode, string> = {
  mois: "Ce mois",
  "mois-dernier": "Mois dernier",
  trimestre: "Ce trimestre",
  annee: "Cette année",
  perso: "Personnalisée",
};

const deux = (n: number) => String(n).padStart(2, "0");
/** Dernier jour du mois (1–12). */
export function finDeMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}
const iso = (a: number, m: number, j: number) => `${a}-${deux(m)}-${deux(j)}`;
const valide = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** Bornes d'une période à partir d'aujourd'hui (ISO, jour de Paris). Personnalisée invalide → ce mois. */
export function bornesPeriode(type: TypePeriode, aujourdhui: string, du?: string, au?: string): { du: string; au: string } {
  const [a, m] = aujourdhui.split("-").map(Number) as [number, number];
  switch (type) {
    case "mois-dernier": {
      const [pa, pm] = m === 1 ? [a - 1, 12] : [a, m - 1];
      return { du: iso(pa, pm, 1), au: iso(pa, pm, finDeMois(pa, pm)) };
    }
    case "trimestre": {
      const debut = Math.floor((m - 1) / 3) * 3 + 1;
      return { du: iso(a, debut, 1), au: iso(a, debut + 2, finDeMois(a, debut + 2)) };
    }
    case "annee":
      return { du: iso(a, 1, 1), au: iso(a, 12, 31) };
    case "perso":
      if (valide(du) && valide(au) && du <= au) return { du, au };
      return { du: iso(a, m, 1), au: iso(a, m, finDeMois(a, m)) };
    default:
      return { du: iso(a, m, 1), au: iso(a, m, finDeMois(a, m)) };
  }
}

/** Les n derniers mois (le mois en cours compris), du plus ancien au plus récent. */
export function derniersMois(aujourdhui: string, n: number): { cle: string; du: string; au: string }[] {
  const [a, m] = aujourdhui.split("-").map(Number) as [number, number];
  const mois: { cle: string; du: string; au: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = a * 12 + (m - 1) - i;
    const ma = Math.floor(total / 12);
    const mm = (total % 12) + 1;
    mois.push({ cle: `${ma}-${deux(mm)}`, du: iso(ma, mm, 1), au: iso(ma, mm, finDeMois(ma, mm)) });
  }
  return mois;
}

/** Nombre de jours entre deux dates ISO (bornes incluses). */
export function joursPeriode(du: string, au: string): number {
  return Math.round((Date.parse(`${au}T00:00:00Z`) - Date.parse(`${du}T00:00:00Z`)) / 86_400_000) + 1;
}
