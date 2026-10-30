"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_GESTION } from "@/lib/permissions";
import { creerSlug } from "@/lib/site/slug";
import { LIBELLES_STATUT } from "@/lib/vehicule";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaAnnonce, schemaRecadrage, type Recadrage, type SaisieAnnonce } from "@/lib/validations/site";
import { annoncePourVehicule, estPubliable, marquerAnnonceModifiee } from "@/server/site/annonces";
import { revaliderSite } from "@/server/site/revalidation";

const rafraichir = (vehiculeId: string) => revalidatePath(`/vehicules/${vehiculeId}`, "layout");

async function annonceExistante(vehiculeId: string) {
  const a = await annoncePourVehicule(vehiculeId);
  if (!a) throw new ErreurMetier("Véhicule introuvable.");
  return a;
}

/** Photo de véhicule appartenant bien à ce véhicule. */
async function photoDuVehicule(fichierId: string) {
  const f = await db.fichier.findUnique({ where: { id: fichierId }, select: { id: true, vehiculeId: true, categorie: true, publique: true } });
  if (!f || f.categorie !== "PHOTO_VEHICULE" || !f.vehiculeId) throw new ErreurMetier("Photo introuvable.");
  return f as typeof f & { vehiculeId: string };
}

export async function enregistrerAnnonce(vehiculeId: string, saisie: SaisieAnnonce) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaAnnonce.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = await annonceExistante(vehiculeId);
    const apres = await db.annonce.update({
      where: { id: avant.id },
      data: {
        titre: d.titre,
        prixAfficheCentimes: d.prixAffiche,
        prixNegociable: d.prixNegociable,
        puissanceCh: d.puissanceCh,
        description: d.description,
        equipements: d.equipements,
        ctAJour: d.ctAJour,
        ctDate: d.ctAJour ? d.ctDate : null,
        carnetEntretien: d.carnetEntretien,
        rapportHistovec: d.rapportHistovec,
        nombreProprietaires: d.premiereMain ? 1 : d.nombreProprietaires,
        premiereMain: d.premiereMain,
        garantieMois: d.garantie ? d.garantieMois : null,
        garantieTexte: d.garantie ? d.garantieTexte : null,
        nonFumeur: d.nonFumeur,
        reviseAvantVente: d.reviseAvantVente,
        travauxRealises: d.reviseAvantVente ? d.travauxRealises : null,
        kilometrageVerifie: d.kilometrageVerifie,
        sourceKilometrage: d.kilometrageVerifie ? d.sourceKilometrage : null,
        misAJourLe: new Date(),
      },
    });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Annonce", entiteId: apres.id, avant, apres });
    rafraichir(vehiculeId);
    revaliderSite(apres.slug);
    return { ok: true, message: apres.publiee ? "Annonce enregistrée : le site est à jour." : "Annonce enregistrée." };
  });
}

/** Interrupteur « Publier sur le site ». */
export async function publierAnnonce(vehiculeId: string, publier: boolean) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const a = await annonceExistante(vehiculeId);
    const v = await db.vehicule.findUnique({
      where: { id: vehiculeId },
      select: { id: true, marque: true, modele: true, version: true, annee: true, statut: true, fichiers: { where: { categorie: "PHOTO_VEHICULE", publique: true }, select: { id: true } } },
    });
    if (!v) throw new ErreurMetier("Véhicule introuvable.");
    if (publier) {
      if (!estPubliable(v.statut)) throw new ErreurMetier(`Publication possible seulement pour un véhicule « En vente » ou « Réservé » (statut actuel : ${LIBELLES_STATUT[v.statut]}).`);
      if (a.prixAfficheCentimes === null) throw new ErreurMetier("Indiquez le prix affiché avant de publier.");
      if (v.fichiers.length === 0) throw new ErreurMetier("Choisissez au moins une photo publique avant de publier.");
    }
    const maintenant = new Date();
    const apres = await db.annonce.update({
      where: { id: a.id },
      data: publier
        ? {
            publiee: true,
            // 1re publication : l'adresse est calculée avec les données du moment, puis figée
            ...(a.publieeLe ? {} : { publieeLe: maintenant, slug: creerSlug(v, v.id) }),
            misAJourLe: maintenant,
          }
        : { publiee: false, depublieeLe: maintenant },
    });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Annonce", entiteId: a.id, avant: { publiee: a.publiee }, apres: { publiee: apres.publiee, slug: apres.slug } });
    rafraichir(vehiculeId);
    revaliderSite(apres.slug);
    return { ok: true, message: publier ? "Annonce publiée sur le site." : "Annonce retirée du site." };
  });
}

/** Coche / décoche « publique » sur une photo (ajoutée à la fin de l'ordre public). */
export async function basculerPhotoPublique(fichierId: string, publique: boolean) {
  return avecDroits(ROLES_GESTION, async () => {
    const f = await photoDuVehicule(fichierId);
    const a = await annonceExistante(f.vehiculeId);
    const dernier = await db.fichier.aggregate({ where: { vehiculeId: f.vehiculeId, categorie: "PHOTO_VEHICULE", publique: true }, _max: { ordrePublic: true } });
    await db.fichier.update({ where: { id: fichierId }, data: publique ? { publique: true, ordrePublic: (dernier._max.ordrePublic ?? -1) + 1 } : { publique: false } });
    if (!publique && a.couvertureId === fichierId) await db.annonce.update({ where: { id: a.id }, data: { couvertureId: null } });
    await marquerAnnonceModifiee(db, f.vehiculeId);
    rafraichir(f.vehiculeId);
    return { ok: true, message: publique ? "Photo ajoutée à l'annonce." : "Photo retirée de l'annonce." };
  });
}

/** Nouvel ordre des photos publiques (glisser-déposer). */
export async function ordonnerPhotosPubliques(vehiculeId: string, ids: string[]) {
  return avecDroits(ROLES_GESTION, async () => {
    const photos = await db.fichier.findMany({ where: { vehiculeId, categorie: "PHOTO_VEHICULE", publique: true }, select: { id: true } });
    const attendus = new Set(photos.map((p) => p.id));
    if (ids.length !== attendus.size || ids.some((id) => !attendus.has(id))) throw new ErreurMetier("La liste des photos a changé : rechargez la page.");
    await db.$transaction(ids.map((id, i) => db.fichier.update({ where: { id }, data: { ordrePublic: i } })));
    await marquerAnnonceModifiee(db, vehiculeId);
    rafraichir(vehiculeId);
    return { ok: true, message: "Ordre des photos enregistré." };
  });
}

export async function definirCouverture(fichierId: string) {
  return avecDroits(ROLES_GESTION, async () => {
    const f = await photoDuVehicule(fichierId);
    if (!f.publique) throw new ErreurMetier("Cochez d'abord cette photo comme publique.");
    const a = await annonceExistante(f.vehiculeId);
    await db.annonce.update({ where: { id: a.id }, data: { couvertureId: fichierId } });
    await marquerAnnonceModifiee(db, f.vehiculeId);
    rafraichir(f.vehiculeId);
    return { ok: true, message: "Photo de couverture choisie." };
  });
}

/** Recadrage 4:3 (null = cadrage automatique centré). */
export async function recadrerPhoto(fichierId: string, recadrage: Recadrage | null) {
  return avecDroits(ROLES_GESTION, async () => {
    const f = await photoDuVehicule(fichierId);
    const r = recadrage === null ? null : schemaRecadrage.parse(recadrage);
    await db.fichier.update({ where: { id: fichierId }, data: { recadrage: r ?? Prisma.DbNull } });
    await marquerAnnonceModifiee(db, f.vehiculeId);
    rafraichir(f.vehiculeId);
    return { ok: true, message: r ? "Recadrage enregistré." : "Recadrage automatique rétabli." };
  });
}
