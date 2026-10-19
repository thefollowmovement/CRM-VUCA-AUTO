// Lectures : journal des paiements, impayés, contrats à encaisser.
import type { Prisma } from "@/generated/prisma/client";
import { imputerPaiements, joursRetardEcheance } from "@/lib/calculs/echeancier";
import { db } from "@/lib/db";
import { aujourdhuiISO, dateCalendaireDepuisISO, dateCalendaireVersISO } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";
import { totalEncaisse } from "@/server/echeances";

const nom = (c: { nom: string; prenom: string | null }) => [c.prenom, c.nom].filter(Boolean).join(" ");

export async function journalPaiements(f: { du?: string; au?: string; mode?: string }) {
  const du = f.du ? dateCalendaireDepuisISO(f.du) : null;
  const au = f.au ? dateCalendaireDepuisISO(f.au) : null;
  const where: Prisma.PaiementWhereInput = {
    date: du || au ? { gte: du ?? undefined, lte: au ?? undefined } : undefined,
    mode: f.mode ? (f.mode as never) : undefined,
  };
  const paiements = await db.paiement.findMany({
    where,
    orderBy: [{ date: "desc" }, { creeLe: "desc" }],
    take: 500,
    include: { contrat: { select: { id: true, numero: true, client: { select: { nom: true, prenom: true } }, vehicule: { select: { immatriculation: true, marque: true, modele: true, version: true } } } } },
  });
  return paiements.map((p) => ({ ...p, client: nom(p.contrat.client), vehicule: p.contrat.vehicule.immatriculation ?? nomVehicule(p.contrat.vehicule) }));
}

/** Échéances en retard et locations terminées non soldées. */
export async function impayes() {
  const aujourdhui = aujourdhuiISO();
  const contrats = await db.contratLocation.findMany({
    where: { archiveLe: null, statut: { in: ["CONFIRMEE", "EN_COURS", "TERMINEE"] } },
    include: {
      client: { select: { id: true, nom: true, prenom: true, telephone: true } },
      vehicule: { select: { immatriculation: true, marque: true, modele: true, version: true } },
      echeances: { where: { statut: { not: "ANNULEE" } }, orderBy: { numero: "asc" } },
      paiements: { orderBy: [{ date: "asc" }, { creeLe: "asc" }], select: { id: true, montantCentimes: true, nature: true } },
      fraisSupplementaires: { select: { montantCentimes: true } },
    },
  });
  const echeancesEnRetard: {
    id: string; contratId: string; numero: string; client: string; telephone: string | null; vehicule: string; libelle: string; date: string; reste: number; jours: number;
  }[] = [];
  const soldes: { contratId: string; numero: string; client: string; telephone: string | null; vehicule: string; reste: number; statut: string }[] = [];
  for (const c of contrats) {
    const imputation = imputerPaiements(c.echeances, c.paiements.filter((p) => p.nature === "LOCATION"));
    for (const e of c.echeances) {
      const imp = imputation.echeances.find((x) => x.id === e.id)!;
      const jours = joursRetardEcheance(dateCalendaireVersISO(e.dateEcheance), imp.statut, aujourdhui);
      if (jours > 0) {
        echeancesEnRetard.push({
          id: e.id, contratId: c.id, numero: c.numero, client: nom(c.client), telephone: c.client.telephone, vehicule: c.vehicule.immatriculation ?? nomVehicule(c.vehicule),
          libelle: e.libelle, date: dateCalendaireVersISO(e.dateEcheance), reste: e.montantCentimes - imp.payeCentimes, jours,
        });
      }
    }
    // Location terminée : tout doit être réglé (loyers + frais − caution retenue déjà comptée en encaissement)
    if (c.statut === "TERMINEE") {
      const reste = c.prixTotalCentimes + c.fraisSupplementaires.reduce((a, f) => a + f.montantCentimes, 0) - totalEncaisse(c.paiements);
      if (reste !== 0) soldes.push({ contratId: c.id, numero: c.numero, client: nom(c.client), telephone: c.client.telephone, vehicule: c.vehicule.immatriculation ?? nomVehicule(c.vehicule), reste, statut: c.statut });
    }
  }
  echeancesEnRetard.sort((a, b) => b.jours - a.jours);
  return {
    echeancesEnRetard,
    soldes: soldes.sort((a, b) => b.reste - a.reste),
    totalEnRetard: echeancesEnRetard.reduce((a, e) => a + e.reste, 0),
  };
}

/** Contrats sur lesquels on peut encaisser (bouton « + » → Paiement). */
export async function contratsAEncaisser() {
  const contrats = await db.contratLocation.findMany({
    where: { archiveLe: null, statut: { in: ["RESERVATION", "CONFIRMEE", "EN_COURS", "TERMINEE"] } },
    orderBy: { departPrevuLe: "desc" },
    take: 200,
    include: {
      client: { select: { nom: true, prenom: true } },
      vehicule: { select: { immatriculation: true, marque: true, modele: true, version: true } },
      paiements: { select: { montantCentimes: true, nature: true } },
      fraisSupplementaires: { select: { montantCentimes: true } },
    },
  });
  return contrats
    .map((c) => ({
      id: c.id,
      libelle: `${c.numero} · ${nom(c.client)} · ${c.vehicule.immatriculation ?? nomVehicule(c.vehicule)}`,
      reste: c.prixTotalCentimes + c.fraisSupplementaires.reduce((a, f) => a + f.montantCentimes, 0) - totalEncaisse(c.paiements),
    }))
    .filter((c) => c.reste > 0);
}
