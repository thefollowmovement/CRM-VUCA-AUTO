"use server";

import { revalidatePath } from "next/cache";
import { calculerPrixLocation } from "@/lib/calculs/location";
import { db } from "@/lib/db";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaPaiement, schemaProlongation, type SaisiePaiement, type SaisieProlongation } from "@/lib/validations/paiement";
import { prochainNumeroAnnuel, recalculerImputation, synchroniserEcheances } from "@/server/echeances";
import { conflits } from "@/server/requetes/contrats";

function rafraichir(contratId: string, vehiculeId: string, clientId: string) {
  revalidatePath("/location", "layout");
  revalidatePath(`/location/contrats/${contratId}`, "layout");
  revalidatePath(`/vehicules/${vehiculeId}`, "layout");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/investisseurs", "layout");
  revalidatePath("/dashboard");
}

export async function encaisserPaiement(contratId: string, saisie: SaisiePaiement) {
  return avecDroits<{ id: string; numeroRecu: string | null }>(ROLES_GESTION, async (u) => {
    const lecture = schemaPaiement.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const c = await db.contratLocation.findUnique({ where: { id: contratId } });
    if (!c) throw new ErreurMetier("Contrat introuvable.");
    if (c.statut === "ANNULEE" && d.nature !== "REMBOURSEMENT") throw new ErreurMetier("Ce contrat est annulé : seul un remboursement est possible.");
    const reglages = await lireReglages();
    const paiement = await db.$transaction(async (tx) => {
      // Un reçu numéroté pour tout argent reçu (pas pour un remboursement)
      const numeroRecu = d.nature === "REMBOURSEMENT" ? null : await prochainNumeroAnnuel(tx, "recu", reglages.prefixeRecu);
      const p = await tx.paiement.create({
        data: { contratId, nature: d.nature, date: d.date, montantCentimes: d.montant, mode: d.mode, reference: d.reference, note: d.note, numeroRecu },
      });
      await recalculerImputation(tx, contratId);
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Paiement", entiteId: p.id, apres: p }, tx);
      return p;
    });
    rafraichir(contratId, c.vehiculeId, c.clientId);
    return {
      ok: true,
      message: `${d.nature === "REMBOURSEMENT" ? "Remboursement" : "Paiement"} de ${formatEuros(d.montant)} enregistré${paiement.numeroRecu ? ` (reçu ${paiement.numeroRecu})` : ""}.`,
      donnees: { id: paiement.id, numeroRecu: paiement.numeroRecu },
    };
  });
}

/** Suppression d'un paiement saisi par erreur (admin). Le numéro de reçu n'est pas réutilisé. */
export async function supprimerPaiement(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const p = await db.paiement.findUnique({ where: { id }, include: { contrat: { select: { vehiculeId: true, clientId: true } } } });
    if (!p) throw new ErreurMetier("Paiement introuvable.");
    if (p.nature === "CAUTION_RETENUE") throw new ErreurMetier("La caution retenue est liée au retour du véhicule : elle ne peut pas être supprimée ici.");
    await db.$transaction(async (tx) => {
      await tx.paiement.delete({ where: { id } });
      await recalculerImputation(tx, p.contratId);
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Paiement", entiteId: id, avant: p }, tx);
    });
    rafraichir(p.contratId, p.contrat.vehiculeId, p.contrat.clientId);
    return { ok: true, message: "Paiement supprimé." };
  });
}

/** Prolongation : nouvelle date de retour, prix recalculé, échéancier complété. */
export async function prolongerContrat(id: string, saisie: SaisieProlongation) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaProlongation.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const retour = lecture.data.retourPrevuLe;
    const c = await db.contratLocation.findUnique({ where: { id }, include: { options: { include: { option: { select: { plafondCentimes: true } } } } } });
    if (!c) throw new ErreurMetier("Contrat introuvable.");
    if (!["RESERVATION", "CONFIRMEE", "EN_COURS"].includes(c.statut)) throw new ErreurMetier("Seule une location réservée ou en cours peut être prolongée.");
    if (retour <= c.retourPrevuLe) {
      return { ok: false, message: "La nouvelle date doit être après le retour prévu actuel.", erreursChamps: { retourPrevuLe: [`Après le ${formatDateHeure(c.retourPrevuLe)}.`] } };
    }
    const autres = await conflits(c.departPrevuLe, retour, id, c.vehiculeId);
    if (autres[0]) throw new ErreurMetier(`Véhicule déjà réservé à partir du ${formatDateHeure(autres[0].departPrevuLe)} (${autres[0].numero}).`);

    const reglages = await lireReglages();
    const prix = calculerPrixLocation({
      type: c.type,
      depart: c.departPrevuLe,
      retour,
      toleranceMinutes: reglages.toleranceRetardMinutes,
      tarifCentimes: c.tarifCentimes,
      tarifJournalierCentimes: c.tarifJournalierCentimes,
      remiseCentimes: c.remiseCentimes,
      fraisLivraisonCentimes: c.fraisLivraisonCentimes,
      options: c.options.map((o) => ({ modeTarif: o.modeTarif, prixCentimes: o.prixCentimes, quantite: o.quantite, plafondCentimes: o.option?.plafondCentimes ?? null })),
    });
    await db.$transaction(async (tx) => {
      for (const [i, o] of c.options.entries()) await tx.optionContrat.update({ where: { id: o.id }, data: { totalCentimes: prix.totalOptions[i] ?? o.totalCentimes } });
      await tx.contratLocation.update({
        where: { id },
        data: { retourPrevuLe: retour, dureeFacturee: prix.unites, joursSupplementaires: prix.joursSupplementaires, prixTotalCentimes: prix.prixTotalCentimes },
      });
      await synchroniserEcheances(tx, id);
      await journaliser(
        { utilisateurId: u.id, action: "MODIFICATION", entite: "Prolongation", entiteId: id, avant: { retourPrevuLe: c.retourPrevuLe, prix: c.prixTotalCentimes }, apres: { retourPrevuLe: retour, prix: prix.prixTotalCentimes } },
        tx,
      );
    });
    rafraichir(id, c.vehiculeId, c.clientId);
    return { ok: true, message: `Location prolongée jusqu'au ${formatDateHeure(retour)} : nouveau total ${formatEuros(prix.prixTotalCentimes)}.` };
  });
}
