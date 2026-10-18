"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichier, TYPES_IMAGES } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import {
  schemaAlertes,
  schemaCategorieDepense,
  schemaDocuments,
  schemaElementChecklist,
  schemaOptionLocation,
  schemaSociete,
  type SaisieAlertes,
  type SaisieCategorieDepense,
  type SaisieDocuments,
  type SaisieElementChecklist,
  type SaisieOptionLocation,
  type SaisieSociete,
} from "@/lib/validations/reglages";
import type { z } from "zod";

// ---------------------------------------------------------------------
//  Réglages généraux (ligne unique id = 1)
// ---------------------------------------------------------------------

async function enregistrerReglages<S extends z.ZodType>(schema: S, saisie: unknown, message: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const lecture = schema.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const avant = await db.reglages.findUnique({ where: { id: 1 } });
    const apres = await db.reglages.upsert({
      where: { id: 1 },
      update: lecture.data as object,
      create: { id: 1, ...(lecture.data as object) },
    });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Reglages", entiteId: "1", avant, apres });
    revalidatePath("/reglages", "layout");
    return { ok: true, message };
  });
}

export async function enregistrerSociete(saisie: SaisieSociete) {
  return enregistrerReglages(schemaSociete, saisie, "Informations de la société enregistrées.");
}

export async function enregistrerDocuments(saisie: SaisieDocuments) {
  return enregistrerReglages(schemaDocuments, saisie, "Textes des documents enregistrés.");
}

export async function enregistrerAlertes(saisie: SaisieAlertes) {
  return enregistrerReglages(schemaAlertes, saisie, "Numérotation et alertes enregistrées.");
}

export async function envoyerLogo(formulaire: FormData) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const fichier = formulaire.get("logo");
    if (!(fichier instanceof File) || fichier.size === 0) throw new ErreurMetier("Choisissez une image.");

    const reglages = await db.reglages.findUnique({ where: { id: 1 } });
    const nouveau = await enregistrerFichier({
      fichier,
      categorie: "LOGO",
      typesAutorises: TYPES_IMAGES,
      utilisateurId: u.id,
    });
    await db.reglages.update({ where: { id: 1 }, data: { logoId: nouveau.id } });
    if (reglages?.logoId) await supprimerFichier(reglages.logoId);

    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Reglages", entiteId: "1", apres: { logoId: nouveau.id } });
    revalidatePath("/reglages", "layout");
    return { ok: true, message: "Logo enregistré." };
  });
}

export async function retirerLogo() {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const reglages = await db.reglages.findUnique({ where: { id: 1 } });
    if (reglages?.logoId) {
      await db.reglages.update({ where: { id: 1 }, data: { logoId: null } });
      await supprimerFichier(reglages.logoId);
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Reglages", entiteId: "1", avant: { logoId: reglages.logoId } });
    }
    revalidatePath("/reglages", "layout");
    return { ok: true, message: "Logo retiré." };
  });
}

// ---------------------------------------------------------------------
//  Catégories de dépenses
// ---------------------------------------------------------------------

export async function enregistrerCategorieDepense(id: string | null, saisie: SaisieCategorieDepense) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const lecture = schemaCategorieDepense.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    if (id) {
      const avant = await db.categorieDepense.findUnique({ where: { id } });
      const apres = await db.categorieDepense.update({ where: { id }, data: lecture.data });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "CategorieDepense", entiteId: id, avant, apres });
    } else {
      const apres = await db.categorieDepense.create({ data: lecture.data });
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "CategorieDepense", entiteId: apres.id, apres });
    }
    revalidatePath("/reglages/categories");
    return { ok: true, message: id ? "Catégorie modifiée." : "Catégorie ajoutée." };
  });
}

export async function supprimerCategorieDepense(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const nbDepenses = await db.depense.count({ where: { categorieId: id } });
    if (nbDepenses > 0) {
      throw new ErreurMetier(`Catégorie utilisée par ${nbDepenses} dépense(s) : désactivez-la plutôt.`);
    }
    const avant = await db.categorieDepense.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "CategorieDepense", entiteId: id, avant });
    revalidatePath("/reglages/categories");
    return { ok: true, message: "Catégorie supprimée." };
  });
}

// ---------------------------------------------------------------------
//  Options de location
// ---------------------------------------------------------------------

export async function enregistrerOptionLocation(id: string | null, saisie: SaisieOptionLocation) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const lecture = schemaOptionLocation.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const { prix, plafond, ...reste } = lecture.data;
    const data = { ...reste, prixCentimes: prix, plafondCentimes: plafond };
    if (id) {
      const avant = await db.optionLocation.findUnique({ where: { id } });
      const apres = await db.optionLocation.update({ where: { id }, data });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "OptionLocation", entiteId: id, avant, apres });
    } else {
      const apres = await db.optionLocation.create({ data });
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "OptionLocation", entiteId: apres.id, apres });
    }
    revalidatePath("/reglages/options");
    return { ok: true, message: id ? "Option modifiée." : "Option ajoutée." };
  });
}

export async function supprimerOptionLocation(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    // Les contrats gardent une copie figée de l'option : la suppression est sans risque.
    const avant = await db.optionLocation.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "OptionLocation", entiteId: id, avant });
    revalidatePath("/reglages/options");
    return { ok: true, message: "Option supprimée." };
  });
}

// ---------------------------------------------------------------------
//  Éléments de check-list (état des lieux)
// ---------------------------------------------------------------------

export async function enregistrerElementChecklist(id: string | null, saisie: SaisieElementChecklist) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const lecture = schemaElementChecklist.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    if (id) {
      const avant = await db.elementChecklist.findUnique({ where: { id } });
      const apres = await db.elementChecklist.update({ where: { id }, data: lecture.data });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ElementChecklist", entiteId: id, avant, apres });
    } else {
      const apres = await db.elementChecklist.create({ data: lecture.data });
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "ElementChecklist", entiteId: apres.id, apres });
    }
    revalidatePath("/reglages/checklist");
    return { ok: true, message: id ? "Élément modifié." : "Élément ajouté." };
  });
}

export async function supprimerElementChecklist(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    // Les états des lieux gardent une copie figée du libellé.
    const avant = await db.elementChecklist.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "ElementChecklist", entiteId: id, avant });
    revalidatePath("/reglages/checklist");
    return { ok: true, message: "Élément supprimé." };
  });
}
