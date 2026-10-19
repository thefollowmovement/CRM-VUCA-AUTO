// =====================================================================
//  Investissement de chaque partenaire et répartition du bénéfice
//  (sections 5.2 et 5.3 du cahier des charges).
//
//  Règles :
//   - Investissement = participations à l'achat + dépenses payées
//     (sauf dépenses « payées avec les recettes du véhicule »).
//   - Commission de gestion VUCA AUTO : prélevée d'abord, uniquement si le
//     bénéfice est positif.
//   - Le reste est réparti au prorata des investissements, ou selon des
//     pourcentages fixes saisis à la main.
//   - Tout est calculé en centimes ; l'écart d'arrondi va à VUCA AUTO
//     (ou, si VUCA AUTO n'est pas concerné, au partenaire le plus engagé)
//     pour que la somme tombe juste.
//   - À reverser = investissement + part du bénéfice (négative si perte).
// =====================================================================

export type ParticipationCalcul = { partenaireId: string; montantCentimes: number };
export type DepenseCalcul = { payeParId: string; montantCentimes: number; payeSurRecettes: boolean };

export type Investissement = {
  partenaireId: string;
  achatCentimes: number;
  depensesCentimes: number;
  totalCentimes: number;
};

/** Investissement de chaque partenaire (participations + dépenses payées de sa poche). */
export function calculerInvestissements(
  participations: ParticipationCalcul[],
  depenses: DepenseCalcul[],
): Investissement[] {
  const parPartenaire = new Map<string, Investissement>();
  const ligne = (id: string) => {
    let l = parPartenaire.get(id);
    if (!l) {
      l = { partenaireId: id, achatCentimes: 0, depensesCentimes: 0, totalCentimes: 0 };
      parPartenaire.set(id, l);
    }
    return l;
  };
  for (const p of participations) ligne(p.partenaireId).achatCentimes += p.montantCentimes;
  for (const d of depenses) {
    if (d.payeSurRecettes) continue; // payée avec l'argent du véhicule : personne n'a investi
    ligne(d.payeParId).depensesCentimes += d.montantCentimes;
  }
  for (const l of parPartenaire.values()) l.totalCentimes = l.achatCentimes + l.depensesCentimes;
  return [...parPartenaire.values()];
}

/** a / b arrondi au plus proche (demi vers l'extérieur), en entiers exacts (BigInt). */
export function diviserArrondi(a: number, b: number): number {
  if (b === 0) throw new Error("Division par zéro");
  const A = BigInt(a);
  const B = BigInt(b);
  const negatif = A < 0n !== B < 0n;
  const absA = A < 0n ? -A : A;
  const absB = B < 0n ? -B : B;
  const q = (absA * 2n + absB) / (absB * 2n);
  return Number(negatif ? -q : q);
}

export type ParametresRepartition = {
  mode: "PRORATA_INVESTISSEMENT" | "POURCENTAGE_FIXE";
  /** Commission de gestion de VUCA AUTO en points de base (2000 = 20 %). */
  commissionBp: number;
  /** Mode POURCENTAGE_FIXE : parts du bénéfice (total 10000). */
  partsFixes?: { partenaireId: string; pourcentageBp: number }[];
  /** Identifiant du partenaire VUCA AUTO. */
  societeId: string;
};

export type LigneRepartition = {
  partenaireId: string;
  achatCentimes: number;
  depensesCentimes: number;
  investiCentimes: number;
  /** Part dans l'investissement total (affichage). */
  partInvestissementBp: number;
  /** Clé de partage du bénéfice (prorata ou pourcentage fixe). */
  partBeneficeBp: number;
  commissionCentimes: number;
  /** Part du bénéfice, commission comprise. */
  beneficeCentimes: number;
  aReverserCentimes: number;
};

export type ResultatRepartition = {
  lignes: LigneRepartition[];
  beneficeCentimes: number;
  commissionCentimes: number;
  beneficeAPartagerCentimes: number;
  totalInvestiCentimes: number;
  totalAReverserCentimes: number;
};

/** Répartit un bénéfice (ou une perte) entre les partenaires. */
export function repartirBenefice(
  investissements: Investissement[],
  beneficeCentimes: number,
  params: ParametresRepartition,
): ResultatRepartition {
  const { societeId } = params;
  const totalInvesti = investissements.reduce((a, i) => a + i.totalCentimes, 0);

  // 1. Commission de gestion (sur bénéfice positif seulement)
  const commission =
    beneficeCentimes > 0 && params.commissionBp > 0 ? diviserArrondi(beneficeCentimes * params.commissionBp, 10000) : 0;
  const aPartager = beneficeCentimes - commission;

  // 2. Clés de partage
  const poids = new Map<string, number>();
  if (params.mode === "POURCENTAGE_FIXE") {
    for (const p of params.partsFixes ?? []) if (p.pourcentageBp > 0) poids.set(p.partenaireId, p.pourcentageBp);
  } else {
    for (const i of investissements) if (i.totalCentimes > 0) poids.set(i.partenaireId, i.totalCentimes);
  }
  const totalPoids = [...poids.values()].reduce((a, b) => a + b, 0);

  // 3. Partenaires concernés : investisseurs, parts fixes, VUCA AUTO si commission
  const ids = new Set<string>(investissements.map((i) => i.partenaireId));
  for (const id of poids.keys()) ids.add(id);
  if (commission !== 0 || totalPoids === 0) ids.add(societeId);

  // 4. Qui reçoit l'écart d'arrondi ? VUCA AUTO si concerné, sinon le plus gros poids.
  let beneficiaireArrondi = societeId;
  if (!ids.has(societeId)) {
    beneficiaireArrondi = [...poids.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? societeId;
  }
  ids.add(beneficiaireArrondi);

  // 5. Parts du bénéfice à partager
  const parts = new Map<string, number>();
  if (totalPoids === 0) {
    parts.set(beneficiaireArrondi, aPartager);
  } else {
    let distribue = 0;
    for (const [id, p] of poids) {
      if (id === beneficiaireArrondi) continue;
      const part = diviserArrondi(aPartager * p, totalPoids);
      parts.set(id, part);
      distribue += part;
    }
    parts.set(beneficiaireArrondi, aPartager - distribue);
  }

  // 6. Clé de partage en bp (affichage) et parts d'investissement
  const idsPoids = [...poids.keys()];
  const bpPartage = pourcentagesEntiers(idsPoids.map((id) => poids.get(id)!));
  const bpInvest = pourcentagesEntiers(investissements.map((i) => i.totalCentimes));

  const lignes: LigneRepartition[] = [...ids].map((id) => {
    const inv = investissements.find((i) => i.partenaireId === id);
    const investi = inv?.totalCentimes ?? 0;
    const com = id === societeId ? commission : 0;
    const benef = (parts.get(id) ?? 0) + com;
    const idxInv = investissements.findIndex((i) => i.partenaireId === id);
    const idxPoids = idsPoids.indexOf(id);
    return {
      partenaireId: id,
      achatCentimes: inv?.achatCentimes ?? 0,
      depensesCentimes: inv?.depensesCentimes ?? 0,
      investiCentimes: investi,
      partInvestissementBp: idxInv >= 0 ? (bpInvest[idxInv] ?? 0) : 0,
      partBeneficeBp: idxPoids >= 0 ? (bpPartage[idxPoids] ?? 0) : 0,
      commissionCentimes: com,
      beneficeCentimes: benef,
      aReverserCentimes: investi + benef,
    };
  });

  // VUCA AUTO en premier, puis par investissement décroissant
  lignes.sort((a, b) =>
    a.partenaireId === societeId ? -1 : b.partenaireId === societeId ? 1 : b.investiCentimes - a.investiCentimes,
  );

  return {
    lignes,
    beneficeCentimes,
    commissionCentimes: commission,
    beneficeAPartagerCentimes: aPartager,
    totalInvestiCentimes: totalInvesti,
    totalAReverserCentimes: lignes.reduce((a, l) => a + l.aReverserCentimes, 0),
  };
}

/** Pourcentages en bp (total 10000, plus fort reste) — pour l'affichage. */
function pourcentagesEntiers(valeurs: number[]): number[] {
  const total = valeurs.reduce((a, b) => a + b, 0);
  if (total <= 0) return valeurs.map(() => 0);
  const brutes = valeurs.map((v) => (v * 10000) / total);
  const parts = brutes.map(Math.floor);
  let reste = 10000 - parts.reduce((a, b) => a + b, 0);
  brutes
    .map((b, i) => ({ i, d: b - Math.floor(b) }))
    .sort((x, y) => y.d - x.d || x.i - y.i)
    .forEach(({ i }) => {
      if (reste > 0) {
        parts[i]! += 1;
        reste -= 1;
      }
    });
  return parts;
}
