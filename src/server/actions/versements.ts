"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { erreurValidation } from "@/lib/validations/erreurs";
import { LIBELLES_TYPE_VERSEMENT, schemaVersement, type SaisieVersement } from "@/lib/validations/finance";

function rafraichir(partenaireId: string, vehiculeId: string | null) {
  revalidatePath("/investisseurs", "layout");
  revalidatePath(`/investisseurs/${partenaireId}`);
  if (vehiculeId) revalidatePath(`/vehicules/${vehiculeId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/portail", "layout");
}

/** Le véhicule (facultatif) doit concerner ce partenaire : participation, dépense payée ou part fixe. */
async function controler(partenaireId: string, vehiculeId: string | null) {
  const p = await db.partenaire.findUnique({ where: { id: partenaireId }, select: { type: true } });
  if (!p) throw new ErreurMetier("Partenaire introuvable.");
  if (p.type === "SOCIETE") throw new ErreurMetier("Les versements concernent les investisseurs : VUCA AUTO garde l'argent des ventes.");
  if (vehiculeId) {
    const lie = await db.vehicule.findFirst({
      where: {
        id: vehiculeId,
        OR: [
          { participations: { some: { partenaireId } } },
          { depenses: { some: { payeParId: partenaireId } } },
          { partsFixes: { some: { partenaireId } } },
          { versements: { some: { partenaireId } } },
        ],
      },
      select: { id: true },
    });
    if (!lie) throw new ErreurMetier("Ce partenaire n'a pas financé ce véhicule.");
  }
}

export async function enregistrerVersement(partenaireId: string, id: string | null, saisie: SaisieVersement) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaVersement.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    await controler(partenaireId, d.vehiculeId);
    const avant = id ? await db.versement.findUnique({ where: { id } }) : null;
    if (id && (!avant || avant.partenaireId !== partenaireId)) throw new ErreurMetier("Versement introuvable.");
    const donnees = { partenaireId, vehiculeId: d.vehiculeId, date: d.date, montantCentimes: d.montant, type: d.type, mode: d.mode, reference: d.reference, note: d.note };
    const v = await db.$transaction(async (tx) => {
      const r = id ? await tx.versement.update({ where: { id }, data: donnees }) : await tx.versement.create({ data: donnees });
      await journaliser({ utilisateurId: u.id, action: id ? "MODIFICATION" : "CREATION", entite: "Versement", entiteId: r.id, avant, apres: r }, tx);
      return r;
    });
    rafraichir(partenaireId, d.vehiculeId);
    if (avant?.vehiculeId && avant.vehiculeId !== d.vehiculeId) rafraichir(partenaireId, avant.vehiculeId);
    return { ok: true, message: `${LIBELLES_TYPE_VERSEMENT[d.type]} de ${formatEuros(d.montant)} enregistré.`, donnees: { id: v.id } };
  });
}

/** Suppression (erreur de saisie) : réservée à l'admin. */
export async function supprimerVersement(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const v = await db.versement.findUnique({ where: { id } });
    if (!v) throw new ErreurMetier("Versement introuvable.");
    await db.$transaction(async (tx) => {
      await tx.versement.delete({ where: { id } });
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Versement", entiteId: id, avant: v }, tx);
    });
    rafraichir(v.partenaireId, v.vehiculeId);
    return { ok: true, message: "Versement supprimé." };
  });
}
