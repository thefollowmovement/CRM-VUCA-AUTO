"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { CategorieFichier } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichierStocke, TYPES_DOCUMENTS } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import { CATEGORIES_DOCUMENTS_CLIENT, schemaClient, type SaisieClient } from "@/lib/validations/location";

function rafraichir(id?: string) {
  revalidatePath("/clients");
  if (id) revalidatePath(`/clients/${id}`, "layout");
  revalidatePath("/location", "layout");
}

async function clientExistant(id: string) {
  const c = await db.client.findUnique({ where: { id } });
  if (!c) throw new ErreurMetier("Client introuvable.");
  if (c.anonymiseLe) throw new ErreurMetier("Ce client a été anonymisé : il ne peut plus être modifié.");
  return c;
}

export async function creerClient(saisie: SaisieClient) {
  return avecDroits<{ id: string; nom: string; prenom: string | null }>(ROLES_GESTION, async (u) => {
    const lecture = schemaClient.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const client = await db.$transaction(async (tx) => {
      const cree = await tx.client.create({ data: { ...d, motifListeNoire: d.listeNoire ? d.motifListeNoire : null } });
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Client", entiteId: cree.id, apres: cree }, tx);
      return cree;
    });
    rafraichir();
    return { ok: true, message: "Client créé.", donnees: { id: client.id, nom: client.nom, prenom: client.prenom } };
  });
}

export async function modifierClient(id: string, saisie: SaisieClient) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaClient.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = await clientExistant(id);
    const apres = await db.client.update({ where: { id }, data: { ...d, motifListeNoire: d.listeNoire ? d.motifListeNoire : null } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Client", entiteId: id, avant, apres });
    rafraichir(id);
    return { ok: true, message: "Client modifié." };
  });
}

/** Contrats qui empêchent d'archiver / anonymiser (réservés ou en cours). */
async function contratsActifs(clientId: string) {
  return db.contratLocation.count({
    where: { archiveLe: null, statut: { in: ["RESERVATION", "CONFIRMEE", "EN_COURS"] }, OR: [{ clientId }, { conducteursAdditionnels: { some: { clientId } } }] },
  });
}

export async function archiverClient(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const c = await clientExistant(id);
    if (c.archiveLe) throw new ErreurMetier("Ce client est déjà archivé.");
    if ((await contratsActifs(id)) > 0) throw new ErreurMetier("Ce client a une location réservée ou en cours : terminez-la ou annulez-la d'abord.");
    await db.client.update({ where: { id }, data: { archiveLe: new Date() } });
    await journaliser({ utilisateurId: u.id, action: "ARCHIVAGE", entite: "Client", entiteId: id });
    rafraichir(id);
    return { ok: true, message: "Client archivé." };
  });
}

export async function restaurerClient(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    await clientExistant(id);
    await db.client.update({ where: { id }, data: { archiveLe: null } });
    await journaliser({ utilisateurId: u.id, action: "RESTAURATION", entite: "Client", entiteId: id });
    rafraichir(id);
    return { ok: true, message: "Client restauré." };
  });
}

/** Suppression définitive : admin, seulement pour un client sans aucune location (erreur de saisie). */
export async function supprimerClient(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const c = await db.client.findUnique({
      where: { id },
      include: { fichiers: { select: { cleStockage: true } }, _count: { select: { contrats: true, conduitesAdditionnelles: true, amendes: true, factures: true } } },
    });
    if (!c) throw new ErreurMetier("Client introuvable.");
    const n = c._count;
    if (n.contrats + n.conduitesAdditionnelles + n.amendes + n.factures > 0) {
      throw new ErreurMetier("Ce client a un historique (locations, PV ou factures) : archivez-le ou anonymisez-le plutôt.");
    }
    await db.$transaction(async (tx) => {
      await tx.client.delete({ where: { id } });
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Client", entiteId: id, avant: c }, tx);
    });
    for (const f of c.fichiers) await supprimerFichierStocke(f.cleStockage);
    rafraichir();
    return { ok: true, message: "Client supprimé." };
  });
}

/**
 * RGPD : efface les données personnelles et les documents du client.
 * Les contrats et montants restent (obligations comptables), rattachés à « Client anonymisé ».
 */
export async function anonymiserClient(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const c = await clientExistant(id);
    if ((await contratsActifs(id)) > 0) throw new ErreurMetier("Ce client a une location réservée ou en cours : impossible de l'anonymiser maintenant.");
    const fichiers = await db.fichier.findMany({ where: { clientId: id }, select: { id: true, cleStockage: true } });
    await db.$transaction(async (tx) => {
      await tx.fichier.deleteMany({ where: { clientId: id } });
      await tx.client.update({
        where: { id },
        data: {
          civilite: null, nom: "Client anonymisé", prenom: null, dateNaissance: null, lieuNaissance: null, adresse: null, codePostal: null,
          ville: null, pays: null, telephone: null, email: null, numeroPermis: null, dateObtentionPermis: null, categoriePermis: null,
          dateValiditePermis: null, typePieceIdentite: null, numeroPieceIdentite: null, dateValiditePieceIdentite: null, entreprise: null,
          siretEntreprise: null, motifListeNoire: c.listeNoire ? "Anonymisé" : null, notes: null,
          anonymiseLe: new Date(), archiveLe: c.archiveLe ?? new Date(),
        },
      });
      // Le journal ne garde pas les données effacées
      await tx.journalActivite.updateMany({
        where: { entite: { in: ["Client", "DocumentClient"] }, entiteId: id },
        data: { avant: Prisma.DbNull, apres: Prisma.DbNull },
      });
      await journaliser({ utilisateurId: u.id, action: "ANONYMISATION", entite: "Client", entiteId: id }, tx);
    });
    for (const f of fichiers) await supprimerFichierStocke(f.cleStockage);
    rafraichir(id);
    return { ok: true, message: "Données personnelles effacées." };
  });
}

export async function envoyerDocumentClient(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const clientId = String(formulaire.get("clientId") ?? "");
    const categorie = String(formulaire.get("categorie") ?? "");
    const fichier = formulaire.get("document");
    if (!(CATEGORIES_DOCUMENTS_CLIENT as readonly string[]).includes(categorie)) throw new ErreurMetier("Type de document invalide.");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucun fichier reçu.");
    await clientExistant(clientId);
    const doc = await enregistrerFichier({
      fichier,
      categorie: categorie as CategorieFichier,
      typesAutorises: TYPES_DOCUMENTS,
      proprietaire: { clientId },
      utilisateurId: u.id,
    });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "DocumentClient", entiteId: clientId, apres: { fichierId: doc.id, categorie } });
    rafraichir(clientId);
    return { ok: true, message: "Document ajouté." };
  });
}

export async function supprimerDocumentClient(fichierId: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const f = await db.fichier.findUnique({ where: { id: fichierId } });
    if (!f?.clientId) throw new ErreurMetier("Document introuvable.");
    await db.fichier.delete({ where: { id: fichierId } });
    await supprimerFichierStocke(f.cleStockage);
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "DocumentClient", entiteId: f.clientId, avant: { categorie: f.categorie, nomOriginal: f.nomOriginal } });
    rafraichir(f.clientId);
    return { ok: true, message: "Document supprimé." };
  });
}
