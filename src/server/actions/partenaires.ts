"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaPartenaire, type SaisiePartenaire } from "@/lib/validations/partenaire";

export async function creerPartenaire(saisie: SaisiePartenaire) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaPartenaire.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);

    const partenaire = await db.partenaire.create({
      data: { ...lecture.data, type: "INVESTISSEUR" },
    });
    await journaliser({
      utilisateurId: u.id,
      action: "CREATION",
      entite: "Partenaire",
      entiteId: partenaire.id,
      apres: partenaire,
    });
    revalidatePath("/investisseurs");
    return { ok: true, message: "Investisseur ajouté.", donnees: { id: partenaire.id } };
  });
}

export async function modifierPartenaire(id: string, saisie: SaisiePartenaire) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaPartenaire.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);

    const avant = await db.partenaire.findUnique({ where: { id } });
    if (!avant) throw new ErreurMetier("Partenaire introuvable.");

    const apres = await db.partenaire.update({ where: { id }, data: lecture.data });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Partenaire", entiteId: id, avant, apres });
    revalidatePath("/investisseurs");
    revalidatePath(`/investisseurs/${id}`);
    return { ok: true, message: "Modifications enregistrées." };
  });
}

/** Archiver (actif = false) ou réactiver un partenaire. */
export async function changerActivitePartenaire(id: string, actif: boolean) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const partenaire = await db.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new ErreurMetier("Partenaire introuvable.");
    if (partenaire.estSysteme && !actif) throw new ErreurMetier("VUCA AUTO ne peut pas être archivé.");

    await db.partenaire.update({ where: { id }, data: { actif } });
    await journaliser({
      utilisateurId: u.id,
      action: actif ? "RESTAURATION" : "ARCHIVAGE",
      entite: "Partenaire",
      entiteId: id,
    });
    revalidatePath("/investisseurs");
    revalidatePath(`/investisseurs/${id}`);
    return { ok: true, message: actif ? "Partenaire réactivé." : "Partenaire archivé." };
  });
}

/** Suppression définitive : seulement si le partenaire n'a jamais rien financé. */
export async function supprimerPartenaire(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const partenaire = await db.partenaire.findUnique({
      where: { id },
      include: {
        utilisateur: { select: { id: true } },
        _count: { select: { participations: true, depensesPayees: true, versements: true, partsFixes: true } },
      },
    });
    if (!partenaire) throw new ErreurMetier("Partenaire introuvable.");
    if (partenaire.estSysteme) throw new ErreurMetier("VUCA AUTO ne peut pas être supprimé.");
    const { participations, depensesPayees, versements, partsFixes } = partenaire._count;
    if (participations + depensesPayees + versements + partsFixes > 0) {
      throw new ErreurMetier("Ce partenaire a un historique financier : archivez-le plutôt que de le supprimer.");
    }
    if (partenaire.utilisateur) {
      throw new ErreurMetier("Un compte utilisateur est lié à ce partenaire : supprimez d'abord ce lien.");
    }

    await db.partenaire.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Partenaire", entiteId: id, avant: partenaire });
    revalidatePath("/investisseurs");
    return { ok: true, message: "Partenaire supprimé." };
  });
}
