// Bilan financier d'un véhicule : rentabilité, investissements, répartition,
// versements déjà faits. Les calculs eux-mêmes sont dans lib/calculs (purs, testés).
import { calculerRentabilite } from "@/lib/calculs/rentabilite";
import { calculerInvestissements, repartirBenefice, type ParametresRepartition } from "@/lib/calculs/repartition";
import { db } from "@/lib/db";

export async function idSociete(): Promise<string> {
  const societe = await db.partenaire.findFirst({ where: { type: "SOCIETE" }, select: { id: true } });
  if (!societe) throw new Error("Le partenaire VUCA AUTO est introuvable (lancez le seed).");
  return societe.id;
}

/**
 * Revenus encaissés hors vente : location (loyers + frais + cautions retenues
 * − remboursements) et indemnités d'assurance.
 */
export async function autresRevenusVehicule(vehiculeId: string): Promise<number> {
  const [paiements, sinistres] = await Promise.all([
    db.paiement.groupBy({ by: ["nature"], where: { contrat: { vehiculeId } }, _sum: { montantCentimes: true } }),
    db.sinistre.aggregate({ where: { vehiculeId }, _sum: { indemniteAssuranceCentimes: true } }),
  ]);
  let total = 0;
  for (const p of paiements) {
    const montant = p._sum.montantCentimes ?? 0;
    total += p.nature === "REMBOURSEMENT" ? -montant : montant;
  }
  return total + (sinistres._sum.indemniteAssuranceCentimes ?? 0);
}

export type BilanVehicule = NonNullable<Awaited<ReturnType<typeof bilanVehicule>>>;

export async function bilanVehicule(vehiculeId: string) {
  const v = await db.vehicule.findUnique({
    where: { id: vehiculeId },
    select: {
      id: true,
      statut: true,
      prixAchatCentimes: true,
      prixVenteCentimes: true,
      prixCibleCentimes: true,
      modeRepartition: true,
      commissionGestionBp: true,
      participations: { select: { partenaireId: true, montantCentimes: true } },
      depenses: { select: { payeParId: true, montantCentimes: true, payeSurRecettes: true } },
      partsFixes: { select: { partenaireId: true, pourcentageBp: true } },
      estimations: { orderBy: { estimeLe: "desc" }, take: 1, select: { montantCentimes: true } },
      versements: { select: { partenaireId: true, montantCentimes: true, type: true } },
    },
  });
  if (!v) return null;

  const [societeId, autresRevenus] = await Promise.all([idSociete(), autresRevenusVehicule(vehiculeId)]);
  const totalDepenses = v.depenses.reduce((a, d) => a + d.montantCentimes, 0);
  const vendu = v.statut === "VENDU" && v.prixVenteCentimes !== null;

  const entree = {
    prixAchatCentimes: v.prixAchatCentimes,
    totalDepensesCentimes: totalDepenses,
    prixVenteCentimes: vendu ? v.prixVenteCentimes : null,
    autresRevenusCentimes: autresRevenus,
    prixCibleCentimes: v.prixCibleCentimes,
    valeurEstimeeCentimes: v.estimations[0]?.montantCentimes ?? null,
  };
  const rentabilite = calculerRentabilite(entree);
  const investissements = calculerInvestissements(v.participations, v.depenses);
  const parametres: ParametresRepartition = {
    mode: v.modeRepartition,
    commissionBp: v.commissionGestionBp,
    partsFixes: v.partsFixes,
    societeId,
  };
  const repartition =
    rentabilite.beneficeCentimes !== null ? repartirBenefice(investissements, rentabilite.beneficeCentimes, parametres) : null;

  // Déjà versé à chaque partenaire pour ce véhicule (capital remboursé + bénéfice versé)
  const verse: Record<string, number> = {};
  for (const x of v.versements) {
    if (x.type === "APPORT_SUPPLEMENTAIRE") continue;
    verse[x.partenaireId] = (verse[x.partenaireId] ?? 0) + x.montantCentimes;
  }

  // Noms de tous les partenaires concernés
  const ids = new Set<string>([societeId, ...investissements.map((i) => i.partenaireId), ...v.partsFixes.map((p) => p.partenaireId), ...Object.keys(verse)]);
  const partenaires = await db.partenaire.findMany({ where: { id: { in: [...ids] } }, select: { id: true, nom: true, type: true } });

  return {
    vehiculeId,
    vendu,
    entree,
    rentabilite,
    investissements,
    parametres,
    repartition,
    verse,
    totalDepenses,
    autresRevenus,
    noms: Object.fromEntries(partenaires.map((p) => [p.id, p.nom])) as Record<string, string>,
    societeId,
  };
}
