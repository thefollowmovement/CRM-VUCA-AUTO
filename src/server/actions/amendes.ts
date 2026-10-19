"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saisieParisVersDate } from "@/lib/dates";
import { formatDateHeure } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichierStocke, TYPES_DOCUMENTS } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaAmende, STATUTS_AMENDE, type SaisieAmende } from "@/lib/validations/paiement";
import { contratAuMoment } from "@/server/requetes/amendes-sinistres";

function rafraichir(id?: string, contratId?: string | null, clientId?: string | null) {
  revalidatePath("/location", "layout");
  if (id) revalidatePath(`/location/amendes/${id}`);
  if (contratId) revalidatePath(`/location/contrats/${contratId}`, "layout");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
}

/** Aperçu dans le formulaire : qui avait le véhicule à cette date ? */
export async function identifierConducteur(vehiculeId: string, dateSaisie: string) {
  return avecDroits<{ contratId: string; numero: string; client: string } | null>(ROLES_GESTION, async () => {
    const date = saisieParisVersDate(dateSaisie);
    if (!vehiculeId || !date) return { ok: true, donnees: null };
    const c = await contratAuMoment(vehiculeId, date);
    return { ok: true, donnees: c ? { contratId: c.id, numero: c.numero, client: [c.client.prenom, c.client.nom].filter(Boolean).join(" ") } : null };
  });
}

export async function enregistrerAmende(id: string | null, saisie: SaisieAmende) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaAmende.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = id ? await db.amende.findUnique({ where: { id }, include: { _count: { select: { frais: true } } } }) : null;
    if (id && !avant) throw new ErreurMetier("PV introuvable.");
    // Identification automatique du contrat et du client
    const c = await contratAuMoment(d.vehiculeId, d.infractionLe);
    const donnees = {
      vehiculeId: d.vehiculeId, infractionLe: d.infractionLe, lieu: d.lieu, montantCentimes: d.montant, numeroAvis: d.numeroAvis,
      dateReception: d.dateReception, dateLimite: d.dateLimite, statut: d.statut, note: d.note,
      contratId: c?.id ?? null, clientId: c?.clientId ?? null, identificationAuto: true,
    };
    // Déjà refacturé : on ne change plus le véhicule, la date ni le montant
    if (avant && avant._count.frais > 0 && (avant.vehiculeId !== d.vehiculeId || avant.infractionLe.getTime() !== d.infractionLe.getTime() || avant.montantCentimes !== d.montant)) {
      throw new ErreurMetier("Ce PV a déjà été refacturé : retirez d'abord le frais sur le contrat pour modifier le véhicule, la date ou le montant.");
    }
    const a = id ? await db.amende.update({ where: { id }, data: donnees }) : await db.amende.create({ data: donnees });
    await journaliser({ utilisateurId: u.id, action: id ? "MODIFICATION" : "CREATION", entite: "Amende", entiteId: a.id, avant, apres: a });
    rafraichir(a.id, a.contratId, a.clientId);
    return {
      ok: true,
      message: c ? `PV enregistré : véhicule loué à ce moment-là (${c.numero}, ${[c.client.prenom, c.client.nom].filter(Boolean).join(" ")}).` : "PV enregistré : aucune location à cette date (véhicule à l'agence ?).",
      donnees: { id: a.id },
    };
  });
}

export async function changerStatutAmende(id: string, statut: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    if (!(STATUTS_AMENDE as readonly string[]).includes(statut) || statut === "REFACTUREE") throw new ErreurMetier("Statut invalide.");
    const a = await db.amende.findUnique({ where: { id } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    await db.amende.update({ where: { id }, data: { statut: statut as "RECUE" } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, avant: { statut: a.statut }, apres: { statut } });
    rafraichir(id, a.contratId, a.clientId);
    return { ok: true, message: "Statut mis à jour." };
  });
}

/** Refacture le PV au client : frais « Amende refacturée » ajouté au contrat. */
export async function refacturerAmende(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const a = await db.amende.findUnique({ where: { id }, include: { _count: { select: { frais: true } } } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (!a.contratId) throw new ErreurMetier("Aucune location identifiée à la date du PV : impossible de le refacturer.");
    if (a._count.frais > 0) throw new ErreurMetier("Ce PV est déjà refacturé.");
    await db.$transaction(async (tx) => {
      await tx.fraisSupplementaire.create({
        data: {
          contratId: a.contratId!, type: "AMENDE_REFACTUREE", libelle: `Amende du ${formatDateHeure(a.infractionLe)}${a.numeroAvis ? ` (avis n° ${a.numeroAvis})` : ""}`,
          quantite: 1, prixUnitaireCentimes: a.montantCentimes, montantCentimes: a.montantCentimes, amendeId: a.id,
        },
      });
      await tx.amende.update({ where: { id }, data: { statut: "REFACTUREE" } });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, apres: { statut: "REFACTUREE", montant: a.montantCentimes } }, tx);
    });
    rafraichir(id, a.contratId, a.clientId);
    return { ok: true, message: "PV refacturé : le montant est ajouté aux frais de la location." };
  });
}

export async function supprimerAmende(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const a = await db.amende.findUnique({ where: { id }, include: { fichiers: true, _count: { select: { frais: true } } } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (a._count.frais > 0) throw new ErreurMetier("Ce PV a été refacturé : retirez d'abord le frais sur le contrat.");
    await db.amende.delete({ where: { id } });
    for (const f of a.fichiers) await supprimerFichierStocke(f.cleStockage);
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Amende", entiteId: id, avant: a });
    rafraichir(undefined, a.contratId, a.clientId);
    return { ok: true, message: "PV supprimé." };
  });
}

export async function envoyerAvisAmende(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const amendeId = String(formulaire.get("amendeId") ?? "");
    const fichier = formulaire.get("document");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucun fichier reçu.");
    const a = await db.amende.findUnique({ where: { id: amendeId } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    await enregistrerFichier({ fichier, categorie: "AVIS_CONTRAVENTION", typesAutorises: TYPES_DOCUMENTS, proprietaire: { amendeId }, utilisateurId: u.id });
    rafraichir(amendeId);
    return { ok: true, message: "Avis de contravention ajouté." };
  });
}
