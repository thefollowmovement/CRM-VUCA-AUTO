"use server";

import { revalidatePath } from "next/cache";
import type { CategorieFichier } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichierStocke, TYPES_DOCUMENTS } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaSinistre, type SaisieSinistre } from "@/lib/validations/paiement";

function rafraichir(id: string | null, vehiculeId: string, contratId?: string | null) {
  revalidatePath("/location", "layout");
  if (id) revalidatePath(`/location/sinistres/${id}`);
  revalidatePath(`/vehicules/${vehiculeId}`, "layout");
  if (contratId) revalidatePath(`/location/contrats/${contratId}`, "layout");
  revalidatePath("/investisseurs", "layout");
}

export async function enregistrerSinistre(id: string | null, saisie: SaisieSinistre) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaSinistre.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    if (d.contratId) {
      const c = await db.contratLocation.findUnique({ where: { id: d.contratId }, select: { vehiculeId: true } });
      if (!c || c.vehiculeId !== d.vehiculeId) throw new ErreurMetier("La location choisie ne concerne pas ce véhicule.");
    }
    const avant = id ? await db.sinistre.findUnique({ where: { id } }) : null;
    if (id && !avant) throw new ErreurMetier("Sinistre introuvable.");
    const donnees = {
      vehiculeId: d.vehiculeId, contratId: d.contratId, survenuLe: d.survenuLe, lieu: d.lieu, description: d.description,
      coutEstimeCentimes: d.coutEstime, franchiseRefactureeCentimes: d.franchiseRefacturee, declareAssurance: d.declareAssurance,
      numeroDossierAssurance: d.numeroDossierAssurance, indemniteAssuranceCentimes: d.indemniteAssurance, statut: d.statut, note: d.note,
    };
    const s = id ? await db.sinistre.update({ where: { id }, data: donnees }) : await db.sinistre.create({ data: donnees });
    await journaliser({ utilisateurId: u.id, action: id ? "MODIFICATION" : "CREATION", entite: "Sinistre", entiteId: s.id, avant, apres: s });
    rafraichir(s.id, s.vehiculeId, s.contratId);
    return { ok: true, message: "Sinistre enregistré.", donnees: { id: s.id } };
  });
}

/** Ajoute la franchise aux frais de la location concernée (une seule fois). */
export async function refacturerFranchise(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const s = await db.sinistre.findUnique({ where: { id } });
    if (!s) throw new ErreurMetier("Sinistre introuvable.");
    if (!s.contratId) throw new ErreurMetier("Aucune location rattachée à ce sinistre.");
    if (!s.franchiseRefactureeCentimes) throw new ErreurMetier("Indiquez d'abord le montant de la franchise à refacturer.");
    const marque = `sinistre:${s.id}`;
    if (await db.fraisSupplementaire.findFirst({ where: { contratId: s.contratId, note: marque } })) throw new ErreurMetier("La franchise est déjà refacturée.");
    await db.fraisSupplementaire.create({
      data: {
        contratId: s.contratId, type: "DOMMAGES", libelle: `Franchise sinistre du ${formatDate(s.survenuLe)}`, quantite: 1,
        prixUnitaireCentimes: s.franchiseRefactureeCentimes, montantCentimes: s.franchiseRefactureeCentimes, note: marque,
      },
    });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Sinistre", entiteId: id, apres: { franchiseRefacturee: s.franchiseRefactureeCentimes } });
    rafraichir(id, s.vehiculeId, s.contratId);
    return { ok: true, message: "Franchise ajoutée aux frais de la location." };
  });
}

export async function supprimerSinistre(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const s = await db.sinistre.findUnique({ where: { id }, include: { fichiers: true, _count: { select: { depenses: true } } } });
    if (!s) throw new ErreurMetier("Sinistre introuvable.");
    if (s._count.depenses > 0) throw new ErreurMetier("Des dépenses sont rattachées à ce sinistre.");
    await db.sinistre.delete({ where: { id } });
    for (const f of s.fichiers) await supprimerFichierStocke(f.cleStockage);
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Sinistre", entiteId: id, avant: s });
    rafraichir(null, s.vehiculeId, s.contratId);
    return { ok: true, message: "Sinistre supprimé." };
  });
}

export async function envoyerFichierSinistre(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const sinistreId = String(formulaire.get("sinistreId") ?? "");
    const fichier = formulaire.get("document");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucun fichier reçu.");
    const s = await db.sinistre.findUnique({ where: { id: sinistreId } });
    if (!s) throw new ErreurMetier("Sinistre introuvable.");
    const categorie: CategorieFichier = fichier.type === "application/pdf" ? "DOCUMENT_SINISTRE" : "PHOTO_SINISTRE";
    await enregistrerFichier({ fichier, categorie, typesAutorises: TYPES_DOCUMENTS, proprietaire: { sinistreId }, utilisateurId: u.id });
    rafraichir(sinistreId, s.vehiculeId);
    return { ok: true, message: "Fichier ajouté." };
  });
}
