// Bilan financier des véhicules : rentabilité, investissements, répartition,
// versements déjà faits. Les calculs eux-mêmes sont dans lib/calculs (purs, testés).
import type { Prisma } from "@/generated/prisma/client";
import { calculerRentabilite } from "@/lib/calculs/rentabilite";
import { calculerInvestissements, repartirBenefice, type ParametresRepartition } from "@/lib/calculs/repartition";
import { db } from "@/lib/db";

export async function idSociete(): Promise<string> {
  const societe = await db.partenaire.findFirst({ where: { type: "SOCIETE" }, select: { id: true } });
  if (!societe) throw new Error("Le partenaire VUCA AUTO est introuvable (lancez le seed).");
  return societe.id;
}

/**
 * Revenus encaissés hors vente, par véhicule : location (loyers + frais +
 * cautions retenues − remboursements) et indemnités d'assurance.
 */
async function autresRevenus(vehiculeIds: string[]): Promise<Map<string, number>> {
  const resultat = new Map<string, number>(vehiculeIds.map((id) => [id, 0]));
  if (vehiculeIds.length === 0) return resultat;
  const [paiements, sinistres] = await Promise.all([
    db.paiement.findMany({
      where: { contrat: { vehiculeId: { in: vehiculeIds } } },
      select: { montantCentimes: true, nature: true, contrat: { select: { vehiculeId: true } } },
    }),
    db.sinistre.groupBy({ by: ["vehiculeId"], where: { vehiculeId: { in: vehiculeIds } }, _sum: { indemniteAssuranceCentimes: true } }),
  ]);
  for (const p of paiements) {
    const id = p.contrat.vehiculeId;
    resultat.set(id, (resultat.get(id) ?? 0) + (p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes));
  }
  for (const s of sinistres) resultat.set(s.vehiculeId, (resultat.get(s.vehiculeId) ?? 0) + (s._sum.indemniteAssuranceCentimes ?? 0));
  return resultat;
}

const SELECT_BILAN = {
  id: true,
  marque: true,
  modele: true,
  version: true,
  immatriculation: true,
  statut: true,
  dateAchat: true,
  dateVente: true,
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
} satisfies Prisma.VehiculeSelect;

type DonneesBilan = Prisma.VehiculeGetPayload<{ select: typeof SELECT_BILAN }>;

/** Assemble le bilan d'un véhicule à partir des données chargées (aucune requête). */
function calculerBilan(v: DonneesBilan, revenus: number, societeId: string) {
  const totalDepenses = v.depenses.reduce((a, d) => a + d.montantCentimes, 0);
  const vendu = v.statut === "VENDU" && v.prixVenteCentimes !== null;
  const entree = {
    prixAchatCentimes: v.prixAchatCentimes,
    totalDepensesCentimes: totalDepenses,
    prixVenteCentimes: vendu ? v.prixVenteCentimes : null,
    autresRevenusCentimes: revenus,
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

  return {
    vehiculeId: v.id,
    vendu,
    entree,
    rentabilite,
    investissements,
    parametres,
    repartition,
    verse,
    totalDepenses,
    autresRevenus: revenus,
    societeId,
  };
}

export type BilanVehicule = NonNullable<Awaited<ReturnType<typeof bilanVehicule>>>;

/** Bilan complet d'un véhicule (avec les noms des partenaires concernés). */
export async function bilanVehicule(vehiculeId: string) {
  const v = await db.vehicule.findUnique({ where: { id: vehiculeId }, select: SELECT_BILAN });
  if (!v) return null;
  const [societeId, revenus] = await Promise.all([idSociete(), autresRevenus([vehiculeId])]);
  const bilan = calculerBilan(v, revenus.get(vehiculeId) ?? 0, societeId);

  // Noms de tous les partenaires concernés
  const ids = new Set<string>([
    societeId,
    ...bilan.investissements.map((i) => i.partenaireId),
    ...v.partsFixes.map((p) => p.partenaireId),
    ...Object.keys(bilan.verse),
  ]);
  const partenaires = await db.partenaire.findMany({ where: { id: { in: [...ids] } }, select: { id: true, nom: true } });
  return { ...bilan, noms: Object.fromEntries(partenaires.map((p) => [p.id, p.nom])) as Record<string, string> };
}

/** Bilans de plusieurs véhicules en 3 requêtes (listes, fiches investisseurs). */
export async function bilansVehicules(where: Prisma.VehiculeWhereInput) {
  const vehicules = await db.vehicule.findMany({ where, select: SELECT_BILAN, orderBy: { dateAchat: "desc" } });
  const [societeId, revenus] = await Promise.all([idSociete(), autresRevenus(vehicules.map((v) => v.id))]);
  return vehicules.map((v) => ({ vehicule: v, bilan: calculerBilan(v, revenus.get(v.id) ?? 0, societeId) }));
}

/** Situation d'un partenaire sur un véhicule (ligne de la fiche investisseur). */
export function situationPartenaire(bilan: ReturnType<typeof calculerBilan>, partenaireId: string) {
  const inv = bilan.investissements.find((i) => i.partenaireId === partenaireId);
  const ligne = bilan.repartition?.lignes.find((l) => l.partenaireId === partenaireId) ?? null;
  const verse = bilan.verse[partenaireId] ?? 0;
  const aReverser = ligne?.aReverserCentimes ?? inv?.totalCentimes ?? 0;
  return {
    achatCentimes: inv?.achatCentimes ?? 0,
    depensesCentimes: inv?.depensesCentimes ?? 0,
    investiCentimes: inv?.totalCentimes ?? 0,
    partBeneficeBp: ligne?.partBeneficeBp ?? null,
    beneficeCentimes: ligne?.beneficeCentimes ?? null,
    aReverserCentimes: aReverser,
    verseCentimes: verse,
    // Reste dû seulement une fois le véhicule vendu
    resteDuCentimes: bilan.vendu ? aReverser - verse : null,
    concerne: inv !== undefined || ligne !== null || verse !== 0,
  };
}

export type ResumePartenaire = {
  capitalEngageCentimes: number;
  vehiculesEnCours: number;
  beneficesRealisesCentimes: number;
  beneficesPrevisionnelsCentimes: number;
  /** Total déjà versé (capital remboursé + bénéfices versés, avec ou sans véhicule). */
  verseCentimes: number;
  resteDuCentimes: number;
};

/** Indicateurs de chaque partenaire, tous véhicules non archivés confondus. */
export async function resumesPartenaires(): Promise<Map<string, ResumePartenaire>> {
  const bilans = await bilansVehicules({ statut: { not: "ARCHIVE" } });
  const resumes = new Map<string, ResumePartenaire>();
  const resume = (id: string) => {
    let r = resumes.get(id);
    if (!r) {
      r = { capitalEngageCentimes: 0, vehiculesEnCours: 0, beneficesRealisesCentimes: 0, beneficesPrevisionnelsCentimes: 0, verseCentimes: 0, resteDuCentimes: 0 };
      resumes.set(id, r);
    }
    return r;
  };
  for (const { bilan } of bilans) {
    const ids = new Set<string>([
      ...bilan.investissements.map((i) => i.partenaireId),
      ...(bilan.repartition?.lignes.map((l) => l.partenaireId) ?? []),
      ...Object.keys(bilan.verse),
    ]);
    for (const id of ids) {
      const s = situationPartenaire(bilan, id);
      const r = resume(id);
      r.verseCentimes += s.verseCentimes;
      if (bilan.vendu) {
        r.beneficesRealisesCentimes += s.beneficeCentimes ?? 0;
        r.resteDuCentimes += s.resteDuCentimes ?? 0;
      } else {
        if (s.investiCentimes > 0) {
          r.capitalEngageCentimes += s.investiCentimes;
          r.vehiculesEnCours += 1;
        }
        r.beneficesPrevisionnelsCentimes += s.beneficeCentimes ?? 0;
      }
    }
  }
  // Versements sans véhicule (ex. résultat de location versé globalement) : réduisent le reste dû
  for (const [id, montant] of await versementsSansVehicule()) {
    const r = resume(id);
    r.verseCentimes += montant;
    r.resteDuCentimes -= montant;
  }
  return resumes;
}

/** Versements (hors apports) qui ne sont rattachés à aucun véhicule, par partenaire. */
export async function versementsSansVehicule(partenaireId?: string): Promise<Map<string, number>> {
  const lignes = await db.versement.groupBy({
    by: ["partenaireId"],
    where: { vehiculeId: null, type: { not: "APPORT_SUPPLEMENTAIRE" }, partenaireId },
    _sum: { montantCentimes: true },
  });
  return new Map(lignes.map((l) => [l.partenaireId, l._sum.montantCentimes ?? 0]));
}
