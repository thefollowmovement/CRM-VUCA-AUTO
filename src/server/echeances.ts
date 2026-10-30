// Échéancier d'un contrat en base : génération et imputation des paiements.
// (Fonctions appelées par les Server Actions, à l'intérieur de leurs transactions.)
import type { Prisma } from "@/generated/prisma/client";
import { genererEcheancier, imputerPaiements } from "@/lib/calculs/echeancier";
import { partiesParis } from "@/lib/dates";
import { dateCalendaireDepuisISO } from "@/lib/format";

type Tx = Prisma.TransactionClient;

/** Recalcule le statut des échéances à partir des paiements de loyer (le plus ancien d'abord). */
export async function recalculerImputation(tx: Tx, contratId: string) {
  const [echeances, paiements] = await Promise.all([
    tx.echeance.findMany({ where: { contratId, statut: { not: "ANNULEE" } }, orderBy: { numero: "asc" } }),
    tx.paiement.findMany({ where: { contratId, nature: "LOCATION" }, orderBy: [{ date: "asc" }, { creeLe: "asc" }] }),
  ]);
  const r = imputerPaiements(echeances, paiements);
  for (const e of r.echeances) await tx.echeance.update({ where: { id: e.id }, data: { statut: e.statut } });
  for (const p of r.paiements) await tx.paiement.update({ where: { id: p.id }, data: { echeanceId: p.echeanceId } });
}

/** (Re)génère l'échéancier du contrat d'après son prix et ses dates, puis réimpute les paiements. */
export async function synchroniserEcheances(tx: Tx, contratId: string) {
  const c = await tx.contratLocation.findUniqueOrThrow({ where: { id: contratId } });
  const lignes = genererEcheancier(c);
  await tx.paiement.updateMany({ where: { contratId }, data: { echeanceId: null } });
  await tx.echeance.deleteMany({ where: { contratId } });
  await tx.echeance.createMany({
    data: lignes.map((l) => ({
      contratId,
      numero: l.numero,
      libelle: l.libelle,
      dateEcheance: dateCalendaireDepuisISO(l.dateEcheance)!,
      periodeDebut: l.periodeDebut ? dateCalendaireDepuisISO(l.periodeDebut) : null,
      periodeFin: l.periodeFin ? dateCalendaireDepuisISO(l.periodeFin) : null,
      montantCentimes: l.montantCentimes,
    })),
  });
  await recalculerImputation(tx, contratId);
}

/** Total encaissé sur un contrat (loyers + frais + caution retenue − remboursements). */
export function totalEncaisse(paiements: { montantCentimes: number; nature: string }[]) {
  return paiements.reduce((a, p) => a + (p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes), 0);
}

/** Prochain numéro annuel (reçus « REC-2026-0001 », factures « FAC-2026-0001 ») via la table Compteur. */
export async function prochainNumeroAnnuel(tx: Tx, cle: "recu" | "facture", prefixe: string) {
  const annee = partiesParis(new Date()).annee;
  const c = await tx.compteur.upsert({ where: { cle: `${cle}:${annee}` }, create: { cle: `${cle}:${annee}`, valeur: 1 }, update: { valeur: { increment: 1 } } });
  return `${prefixe}-${annee}-${String(c.valeur).padStart(4, "0")}`;
}
