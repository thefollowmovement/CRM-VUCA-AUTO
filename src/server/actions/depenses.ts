"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichierStocke, TYPES_DOCUMENTS } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaDepense, type SaisieDepense } from "@/lib/validations/finance";

function rafraichir(vehiculeId: string) {
  revalidatePath("/depenses");
  revalidatePath(`/vehicules/${vehiculeId}`, "layout");
  revalidatePath("/vehicules");
  revalidatePath("/investisseurs", "layout");
}

/** Vérifie véhicule, catégorie et payeur ; renvoie le libellé par défaut (nom de la catégorie). */
async function verifier(d: { vehiculeId: string; categorieId: string; payeParId: string }) {
  const [vehicule, categorie, payeur] = await Promise.all([
    db.vehicule.findUnique({ where: { id: d.vehiculeId }, select: { id: true, kilometrageActuel: true } }),
    db.categorieDepense.findUnique({ where: { id: d.categorieId }, select: { nom: true } }),
    db.partenaire.findUnique({ where: { id: d.payeParId }, select: { id: true } }),
  ]);
  if (!vehicule) throw new ErreurMetier("Véhicule introuvable.");
  if (!categorie) throw new ErreurMetier("Catégorie introuvable.");
  if (!payeur) throw new ErreurMetier("Payeur introuvable.");
  return { vehicule, libelleParDefaut: categorie.nom };
}

export async function creerDepense(saisie: SaisieDepense) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaDepense.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const { vehicule, libelleParDefaut } = await verifier(d);

    const depense = await db.$transaction(async (tx) => {
      const { montant, ...reste } = d;
      const cree = await tx.depense.create({ data: { ...reste, libelle: d.libelle ?? libelleParDefaut, montantCentimes: montant } });
      // Un kilométrage plus élevé que celui connu met à jour le véhicule.
      if (d.kilometrage !== null && d.kilometrage > (vehicule.kilometrageActuel ?? -1)) {
        await tx.vehicule.update({ where: { id: d.vehiculeId }, data: { kilometrageActuel: d.kilometrage, kilometrageActuelLe: new Date() } });
      }
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Depense", entiteId: cree.id, apres: cree }, tx);
      return cree;
    });
    rafraichir(d.vehiculeId);
    return { ok: true, message: "Dépense enregistrée.", donnees: { id: depense.id } };
  });
}

export async function modifierDepense(id: string, saisie: SaisieDepense) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaDepense.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = await db.depense.findUnique({ where: { id } });
    if (!avant) throw new ErreurMetier("Dépense introuvable.");
    const { libelleParDefaut } = await verifier(d);

    const { montant, ...reste } = d;
    const apres = await db.depense.update({ where: { id }, data: { ...reste, libelle: d.libelle ?? libelleParDefaut, montantCentimes: montant } });
    // Les justificatifs suivent la dépense si elle change de véhicule.
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Depense", entiteId: id, avant, apres });
    rafraichir(avant.vehiculeId);
    if (avant.vehiculeId !== d.vehiculeId) rafraichir(d.vehiculeId);
    return { ok: true, message: "Dépense modifiée." };
  });
}

export async function supprimerDepense(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const depense = await db.depense.findUnique({ where: { id }, include: { justificatifs: { select: { cleStockage: true } } } });
    if (!depense) throw new ErreurMetier("Dépense introuvable.");
    await db.$transaction(async (tx) => {
      await tx.depense.delete({ where: { id } }); // justificatifs supprimés en cascade
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Depense", entiteId: id, avant: depense }, tx);
    });
    for (const f of depense.justificatifs) await supprimerFichierStocke(f.cleStockage);
    rafraichir(depense.vehiculeId);
    return { ok: true, message: "Dépense supprimée." };
  });
}

export async function ajouterJustificatif(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const depenseId = String(formulaire.get("depenseId") ?? "");
    const fichier = formulaire.get("justificatif");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucun fichier reçu.");
    const depense = await db.depense.findUnique({ where: { id: depenseId }, select: { id: true, vehiculeId: true } });
    if (!depense) throw new ErreurMetier("Dépense introuvable.");
    const f = await enregistrerFichier({
      fichier,
      categorie: "JUSTIFICATIF_DEPENSE",
      typesAutorises: TYPES_DOCUMENTS,
      proprietaire: { depenseId },
      utilisateurId: u.id,
    });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "JustificatifDepense", entiteId: depenseId, apres: { fichierId: f.id } });
    rafraichir(depense.vehiculeId);
    return { ok: true, message: "Justificatif ajouté." };
  });
}

export async function supprimerJustificatif(fichierId: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const f = await db.fichier.findUnique({ where: { id: fichierId }, include: { depense: { select: { vehiculeId: true } } } });
    if (!f?.depenseId || !f.depense) throw new ErreurMetier("Justificatif introuvable.");
    await db.fichier.delete({ where: { id: fichierId } });
    await supprimerFichierStocke(f.cleStockage);
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "JustificatifDepense", entiteId: f.depenseId, avant: f });
    rafraichir(f.depense.vehiculeId);
    return { ok: true, message: "Justificatif supprimé." };
  });
}
