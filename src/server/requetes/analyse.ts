// Analyse financière par période : dashboard, rapports, relevés investisseurs.
// Toutes les données sont chargées en une fois, puis les calculs (purs) sont
// faits en mémoire avec lib/calculs/periode.ts et lib/calculs/repartition.ts.
import { joursEnStock } from "@/lib/calculs/vehicule";
import { tauxOccupation } from "@/lib/calculs/location";
import { resultatPeriode, type ResultatPeriode, type VehiculePeriode } from "@/lib/calculs/periode";
import { calculerInvestissements, repartirBenefice, type Investissement, type ParametresRepartition, type ResultatRepartition } from "@/lib/calculs/repartition";
import { db } from "@/lib/db";
import { jourParisISO } from "@/lib/dates";
import { dateCalendaireVersISO } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";
import { idSociete } from "@/server/requetes/rentabilite";

const iso = dateCalendaireVersISO;

export type VehiculeAnalyse = {
  id: string;
  nom: string;
  immatriculation: string | null;
  statut: string;
  type: "ACHAT_REVENTE" | "LOCATION" | "MIXTE";
  dateAchat: string;
  dateVente: string | null;
  prixAchatCentimes: number;
  prixVenteCentimes: number | null;
  totalDepensesCentimes: number;
  periode: VehiculePeriode;
  depenses: { date: string; montantCentimes: number; categorie: string }[];
  investissements: Investissement[];
  parametres: ParametresRepartition;
  /** Location : début du suivi d'occupation, locations et immobilisations (dates réelles). */
  occupation: { debut: Date; locations: { debut: Date; fin: Date }[]; immobilisations: { debut: Date; fin: Date }[] } | null;
};

/** Charge tous les véhicules utiles à l'analyse (archivés exclus, sauf s'ils ont été vendus). */
export async function chargerAnalyse(): Promise<{ vehicules: VehiculeAnalyse[]; societeId: string }> {
  const [societeId, vehicules] = await Promise.all([
    idSociete(),
    db.vehicule.findMany({
      where: { OR: [{ statut: { not: "ARCHIVE" } }, { dateVente: { not: null } }] },
      select: {
        id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true, typeExploitation: true,
        dateAchat: true, dateVente: true, prixAchatCentimes: true, prixVenteCentimes: true, dateMiseEnLocation: true,
        modeRepartition: true, commissionGestionBp: true,
        participations: { select: { partenaireId: true, montantCentimes: true } },
        partsFixes: { select: { partenaireId: true, pourcentageBp: true } },
        depenses: { select: { date: true, montantCentimes: true, payeParId: true, payeSurRecettes: true, categorie: { select: { nom: true } } } },
        sinistres: { select: { survenuLe: true, indemniteAssuranceCentimes: true } },
        historiqueStatuts: { orderBy: { changeLe: "asc" }, select: { nouveauStatut: true, changeLe: true } },
        contrats: {
          select: {
            statut: true, departPrevuLe: true, retourPrevuLe: true, departReelLe: true, retourReelLe: true,
            paiements: { select: { date: true, montantCentimes: true, nature: true } },
          },
        },
      },
    }),
  ]);
  const maintenant = new Date();
  return {
    societeId,
    vehicules: vehicules.map((v) => {
      const vendu = v.dateVente !== null && v.prixVenteCentimes !== null;
      const revenus = [
        ...v.contrats.flatMap((c) =>
          c.paiements.map((p) => ({ date: iso(p.date), montantCentimes: p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes })),
        ),
        ...v.sinistres.filter((s) => s.indemniteAssuranceCentimes).map((s) => ({ date: jourParisISO(s.survenuLe), montantCentimes: s.indemniteAssuranceCentimes! })),
      ];
      let occupation: VehiculeAnalyse["occupation"] = null;
      if (v.typeExploitation !== "ACHAT_REVENTE") {
        const immobilisations: { debut: Date; fin: Date }[] = [];
        let depuis: Date | null = null;
        for (const h of v.historiqueStatuts) {
          if (h.nouveauStatut === "IMMOBILISE" && !depuis) depuis = h.changeLe;
          else if (h.nouveauStatut !== "IMMOBILISE" && depuis) {
            immobilisations.push({ debut: depuis, fin: h.changeLe });
            depuis = null;
          }
        }
        if (depuis) immobilisations.push({ debut: depuis, fin: maintenant });
        occupation = {
          debut: v.dateMiseEnLocation ?? v.dateAchat,
          locations: v.contrats
            .filter((c) => c.statut === "EN_COURS" || c.statut === "TERMINEE")
            .map((c) => ({ debut: c.departReelLe ?? c.departPrevuLe, fin: c.retourReelLe ?? (c.statut === "EN_COURS" ? maintenant : c.retourPrevuLe) })),
          immobilisations,
        };
      }
      const depenses = v.depenses.map((d) => ({ date: iso(d.date), montantCentimes: d.montantCentimes, categorie: d.categorie.nom }));
      return {
        id: v.id,
        nom: nomVehicule(v),
        immatriculation: v.immatriculation,
        statut: v.statut,
        type: v.typeExploitation,
        dateAchat: iso(v.dateAchat),
        dateVente: vendu ? iso(v.dateVente) : null,
        prixAchatCentimes: v.prixAchatCentimes,
        prixVenteCentimes: vendu ? v.prixVenteCentimes : null,
        totalDepensesCentimes: depenses.reduce((a, d) => a + d.montantCentimes, 0),
        periode: {
          typeExploitation: v.typeExploitation,
          prixAchatCentimes: v.prixAchatCentimes,
          prixVenteCentimes: vendu ? v.prixVenteCentimes : null,
          dateVente: vendu ? iso(v.dateVente) : null,
          depenses,
          revenus,
        },
        depenses,
        investissements: calculerInvestissements(v.participations, v.depenses),
        parametres: { mode: v.modeRepartition, commissionBp: v.commissionGestionBp, partsFixes: v.partsFixes, societeId },
        occupation,
      };
    }),
  };
}

export type LigneAnalyse = {
  vehicule: VehiculeAnalyse;
  resultat: ResultatPeriode;
  repartition: ResultatRepartition | null;
  /** Part du partenaire filtré (ou null sans filtre). */
  partPartenaireCentimes: number | null;
};

/** Le partenaire a-t-il de l'argent (ou une part fixe) dans ce véhicule ? */
export function concerne(v: VehiculeAnalyse, partenaireId: string): boolean {
  return v.investissements.some((i) => i.partenaireId === partenaireId && i.totalCentimes > 0) || (v.parametres.partsFixes ?? []).some((p) => p.partenaireId === partenaireId);
}

/** Résultat de la période, véhicule par véhicule, réparti entre les partenaires (règles 5.3). */
export function analyserPeriode(vehicules: VehiculeAnalyse[], du: string, au: string, partenaireId?: string) {
  const perimetre = partenaireId ? vehicules.filter((v) => concerne(v, partenaireId)) : vehicules;
  const lignes: LigneAnalyse[] = perimetre.map((v) => {
    const resultat = resultatPeriode(v.periode, du, au);
    const repartition = resultat.totalCentimes !== 0 ? repartirBenefice(v.investissements, resultat.totalCentimes, v.parametres) : null;
    const part = partenaireId ? (repartition?.lignes.find((l) => l.partenaireId === partenaireId)?.beneficeCentimes ?? 0) : null;
    return { vehicule: v, resultat, repartition, partPartenaireCentimes: part };
  });
  const s = (f: (l: LigneAnalyse) => number) => lignes.reduce((a, l) => a + f(l), 0);

  // Bénéfice par partenaire (somme des parts véhicule par véhicule)
  const parPartenaire = new Map<string, number>();
  for (const l of lignes) for (const r of l.repartition?.lignes ?? []) parPartenaire.set(r.partenaireId, (parPartenaire.get(r.partenaireId) ?? 0) + r.beneficeCentimes);

  // Dépenses payées pendant la période, par catégorie
  const categories = new Map<string, number>();
  for (const v of perimetre) for (const d of v.depenses) if (d.date >= du && d.date <= au) categories.set(d.categorie, (categories.get(d.categorie) ?? 0) + d.montantCentimes);
  const depensesParCategorie = [...categories.entries()].map(([categorie, montantCentimes]) => ({ categorie, montantCentimes })).sort((a, b) => b.montantCentimes - a.montantCentimes);

  const vendus = lignes.filter((l) => l.resultat.vendu);
  return {
    lignes,
    vendus,
    achetes: perimetre.filter((v) => v.dateAchat >= du && v.dateAchat <= au),
    totaux: {
      caVenteCentimes: s((l) => l.resultat.caVenteCentimes),
      beneficeVenteCentimes: s((l) => l.resultat.beneficeVenteCentimes),
      revenusLocationCentimes: s((l) => l.resultat.revenusLocationCentimes),
      chargesLocationCentimes: s((l) => l.resultat.chargesLocationCentimes),
      beneficeNetCentimes: s((l) => l.resultat.totalCentimes),
      depensesCentimes: depensesParCategorie.reduce((a, c) => a + c.montantCentimes, 0),
      partPartenaireCentimes: partenaireId ? s((l) => l.partPartenaireCentimes ?? 0) : null,
    },
    depensesParCategorie,
    parPartenaire,
  };
}

/** Bénéfice complet d'un véhicule vendu (5.1 : vente + revenus − coût de revient) et durée de revente. */
export function bilanVente(v: VehiculeAnalyse) {
  if (v.prixVenteCentimes === null || v.dateVente === null) return null;
  const revenus = v.periode.revenus.reduce((a, r) => a + r.montantCentimes, 0);
  const benefice = v.prixVenteCentimes + revenus - v.prixAchatCentimes - v.totalDepensesCentimes;
  return {
    beneficeCentimes: benefice,
    margeBp: v.prixVenteCentimes > 0 ? Math.round((benefice / v.prixVenteCentimes) * 10000) : null,
    jours: joursEnStock(new Date(`${v.dateAchat}T00:00:00Z`), new Date(`${v.dateVente}T00:00:00Z`)),
  };
}

/** Taux d'occupation d'un véhicule de location sur [du, au] (limité à aujourd'hui et à la mise en location). */
export function occupationPeriode(v: VehiculeAnalyse, du: string, au: string) {
  if (!v.occupation) return null;
  const debut = new Date(Math.max(Date.parse(`${du}T00:00:00Z`), v.occupation.debut.getTime()));
  const finPeriode = Date.parse(`${au}T00:00:00Z`) + 86_400_000;
  const finVente = v.dateVente ? Date.parse(`${v.dateVente}T00:00:00Z`) : Infinity;
  const fin = new Date(Math.min(finPeriode, Date.now(), finVente));
  if (fin <= debut) return null;
  return tauxOccupation({ debut, fin, locations: v.occupation.locations, immobilisations: v.occupation.immobilisations });
}
