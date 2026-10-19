"use server";

import { revalidatePath } from "next/cache";
import type { CategorieFichier, StatutVehicule } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichierStocke, TYPES_DOCUMENTS, TYPES_IMAGES } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import {
  schemaParametresRepartition,
  schemaVente,
  type SaisieParametresRepartition,
  type SaisieVente,
} from "@/lib/validations/finance";
import {
  CATEGORIES_DOCUMENTS_VEHICULE,
  schemaChangementStatut,
  schemaEcheances,
  schemaEstimation,
  schemaVehicule,
  type DonneesVehicule,
  type SaisieChangementStatut,
  type SaisieEcheances,
  type SaisieEstimation,
  type SaisieVehicule,
} from "@/lib/validations/vehicule";

// ---------------------------------------------------------------------
//  Outils
// ---------------------------------------------------------------------

/** Champs de la table Vehicule à partir des données validées du formulaire. */
function champsVehicule(d: DonneesVehicule) {
  const totalFinance = d.financement.reduce((a, l) => a + l.montant, 0);
  const ecart = totalFinance !== d.prixAchat;
  return {
    marque: d.marque,
    modele: d.modele,
    version: d.version,
    immatriculation: d.immatriculation,
    vin: d.vin,
    annee: d.annee,
    dateMiseEnCirculation: d.dateMiseEnCirculation,
    carburant: d.carburant,
    boite: d.boite,
    couleur: d.couleur,
    nombrePlaces: d.nombrePlaces,
    puissanceFiscale: d.puissanceFiscale,
    critAir: d.critAir,
    typeExploitation: d.typeExploitation,
    dateAchat: d.dateAchat,
    prixAchatCentimes: d.prixAchat,
    kilometrageAchat: d.kilometrageAchat,
    provenance: d.provenance,
    nomVendeur: d.nomVendeur,
    lienAnnonce: d.lienAnnonce,
    notesAchat: d.notesAchat,
    prixCibleCentimes: d.prixCible,
    tarifJournalierCentimes: d.tarifJournalier,
    tarifHebdoCentimes: d.tarifHebdo,
    tarifMensuelCentimes: d.tarifMensuel,
    kmInclusParJour: d.kmInclusParJour,
    kmInclusParMois: d.kmInclusParMois,
    prixKmSupCentimes: d.prixKmSup,
    cautionDefautCentimes: d.cautionDefaut,
    franchiseDefautCentimes: d.franchiseDefaut,
    dateMiseEnLocation: d.dateMiseEnLocation,
    kilometrageActuel: d.kilometrageActuel ?? d.kilometrageAchat,
    dateProchainControleTechnique: d.dateProchainControleTechnique,
    assureur: d.assureur,
    numeroPoliceAssurance: d.numeroPoliceAssurance,
    dateEcheanceAssurance: d.dateEcheanceAssurance,
    dateProchaineVidange: d.dateProchaineVidange,
    kmProchaineVidange: d.kmProchaineVidange,
    dateProchaineRevision: d.dateProchaineRevision,
    kmProchaineRevision: d.kmProchaineRevision,
    notes: d.notes,
    ecartFinancementAccepte: ecart,
    ecartFinancementMotif: ecart ? d.motifEcart : null,
  };
}

/** Vérifie que les financeurs existent. */
async function verifierFinanceurs(ids: string[]) {
  if (ids.length === 0) return;
  const trouves = await db.partenaire.count({ where: { id: { in: ids } } });
  if (trouves !== new Set(ids).size) throw new ErreurMetier("Un des financeurs choisis n'existe plus.");
}

/** Refuse l'action si le véhicule a une location réservée ou en cours. */
async function sansLocationActive(vehiculeId: string, action: string) {
  const c = await db.contratLocation.findFirst({
    where: { vehiculeId, archiveLe: null, statut: { in: ["RESERVATION", "CONFIRMEE", "EN_COURS"] } },
    select: { numero: true },
  });
  if (c) throw new ErreurMetier(`Ce véhicule a une location réservée ou en cours (${c.numero}) : terminez-la ou annulez-la avant de ${action}.`);
}

/** Message clair pour les doublons d'immatriculation / VIN. */
function messageDoublon(erreur: unknown): string | null {
  if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
    const cible = JSON.stringify(erreur.meta ?? {});
    if (cible.includes("immatriculation")) return "Un véhicule avec cette immatriculation existe déjà.";
    if (cible.includes("vin")) return "Un véhicule avec ce VIN existe déjà.";
  }
  return null;
}

function rafraichir(id?: string) {
  revalidatePath("/vehicules");
  if (id) revalidatePath(`/vehicules/${id}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/investisseurs", "layout");
}

async function vehiculeExistant(id: string) {
  const v = await db.vehicule.findUnique({ where: { id } });
  if (!v) throw new ErreurMetier("Véhicule introuvable.");
  return v;
}

// ---------------------------------------------------------------------
//  Création / modification
// ---------------------------------------------------------------------

export async function creerVehicule(saisie: SaisieVehicule) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaVehicule.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    await verifierFinanceurs(d.financement.map((l) => l.partenaireId));
    const statut: StatutVehicule = d.statutInitial ?? "EN_PREPARATION";

    try {
      const vehicule = await db.$transaction(async (tx) => {
        const v = await tx.vehicule.create({ data: { ...champsVehicule(d), statut } });
        if (d.financement.length) {
          await tx.participation.createMany({
            data: d.financement.map((l) => ({
              vehiculeId: v.id,
              partenaireId: l.partenaireId,
              montantCentimes: l.montant,
              date: d.dateAchat,
              note: l.note,
            })),
          });
        }
        await tx.historiqueStatutVehicule.create({
          data: { vehiculeId: v.id, ancienStatut: null, nouveauStatut: statut, motif: "Création du véhicule", utilisateurId: u.id },
        });
        await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Vehicule", entiteId: v.id, apres: { ...v, financement: d.financement } }, tx);
        return v;
      });
      rafraichir();
      return { ok: true, message: "Véhicule ajouté.", donnees: { id: vehicule.id } };
    } catch (erreur) {
      const message = messageDoublon(erreur);
      if (message) return { ok: false, message, erreursChamps: { [message.includes("VIN") ? "vin" : "immatriculation"]: [message] } };
      throw erreur;
    }
  });
}

export async function modifierVehicule(id: string, saisie: SaisieVehicule) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaVehicule.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    await verifierFinanceurs(d.financement.map((l) => l.partenaireId));
    const avant = await db.vehicule.findUnique({ where: { id }, include: { participations: true } });
    if (!avant) throw new ErreurMetier("Véhicule introuvable.");

    try {
      await db.$transaction(async (tx) => {
        const apres = await tx.vehicule.update({ where: { id }, data: champsVehicule(d) });
        // Le financement est remplacé en entier (une ligne par financeur).
        await tx.participation.deleteMany({ where: { vehiculeId: id } });
        if (d.financement.length) {
          await tx.participation.createMany({
            data: d.financement.map((l) => ({
              vehiculeId: id,
              partenaireId: l.partenaireId,
              montantCentimes: l.montant,
              date: avant.participations.find((p) => p.partenaireId === l.partenaireId)?.date ?? d.dateAchat,
              note: l.note,
            })),
          });
        }
        await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Vehicule", entiteId: id, avant, apres: { ...apres, financement: d.financement } }, tx);
      });
      rafraichir(id);
      return { ok: true, message: "Modifications enregistrées." };
    } catch (erreur) {
      const message = messageDoublon(erreur);
      if (message) return { ok: false, message, erreursChamps: { [message.includes("VIN") ? "vin" : "immatriculation"]: [message] } };
      throw erreur;
    }
  });
}

export async function modifierEcheances(id: string, saisie: SaisieEcheances) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaEcheances.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const avant = await vehiculeExistant(id);
    const d = lecture.data;
    const apres = await db.vehicule.update({
      where: { id },
      data: {
        ...d,
        kilometrageActuelLe: d.kilometrageActuel !== avant.kilometrageActuel ? new Date() : avant.kilometrageActuelLe,
      },
    });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Vehicule", entiteId: id, avant, apres });
    rafraichir(id);
    return { ok: true, message: "Échéances mises à jour." };
  });
}

// ---------------------------------------------------------------------
//  Statut, archivage, suppression
// ---------------------------------------------------------------------

export async function changerStatutVehicule(id: string, saisie: SaisieChangementStatut) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaChangementStatut.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const v = await vehiculeExistant(id);
    if (v.statut === "VENDU") throw new ErreurMetier("Ce véhicule est vendu : son statut ne peut plus être changé ici.");
    if (v.statut === "ARCHIVE") throw new ErreurMetier("Restaurez d'abord ce véhicule archivé.");
    if (v.statut === lecture.data.statut) return { ok: true, message: "Statut inchangé." };

    await db.$transaction(async (tx) => {
      await tx.vehicule.update({ where: { id }, data: { statut: lecture.data.statut } });
      await tx.historiqueStatutVehicule.create({
        data: { vehiculeId: id, ancienStatut: v.statut, nouveauStatut: lecture.data.statut, motif: lecture.data.motif, utilisateurId: u.id },
      });
    });
    rafraichir(id);
    return { ok: true, message: "Statut mis à jour." };
  });
}

export async function archiverVehicule(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const v = await vehiculeExistant(id);
    if (v.statut === "ARCHIVE") return { ok: true, message: "Déjà archivé." };
    await sansLocationActive(id, "l'archiver");
    await db.$transaction(async (tx) => {
      await tx.vehicule.update({ where: { id }, data: { statut: "ARCHIVE", archiveLe: new Date() } });
      await tx.historiqueStatutVehicule.create({
        data: { vehiculeId: id, ancienStatut: v.statut, nouveauStatut: "ARCHIVE", motif: "Archivage", utilisateurId: u.id },
      });
      await journaliser({ utilisateurId: u.id, action: "ARCHIVAGE", entite: "Vehicule", entiteId: id }, tx);
    });
    rafraichir(id);
    return { ok: true, message: "Véhicule archivé." };
  });
}

export async function restaurerVehicule(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const v = await vehiculeExistant(id);
    if (v.statut !== "ARCHIVE") return { ok: true, message: "Ce véhicule n'est pas archivé." };
    // On revient au statut qu'il avait avant l'archivage.
    const archivage = await db.historiqueStatutVehicule.findFirst({
      where: { vehiculeId: id, nouveauStatut: "ARCHIVE" },
      orderBy: { changeLe: "desc" },
    });
    const statut = archivage?.ancienStatut && archivage.ancienStatut !== "ARCHIVE" ? archivage.ancienStatut : "EN_PREPARATION";
    await db.$transaction(async (tx) => {
      await tx.vehicule.update({ where: { id }, data: { statut, archiveLe: null } });
      await tx.historiqueStatutVehicule.create({
        data: { vehiculeId: id, ancienStatut: "ARCHIVE", nouveauStatut: statut, motif: "Restauration", utilisateurId: u.id },
      });
      await journaliser({ utilisateurId: u.id, action: "RESTAURATION", entite: "Vehicule", entiteId: id }, tx);
    });
    rafraichir(id);
    return { ok: true, message: "Véhicule restauré." };
  });
}

/** Suppression définitive (admin) : uniquement pour corriger une erreur de saisie, sans historique. */
export async function supprimerVehicule(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const v = await db.vehicule.findUnique({
      where: { id },
      include: {
        fichiers: { select: { cleStockage: true } },
        _count: { select: { depenses: true, contrats: true, amendes: true, sinistres: true, versements: true, factures: true } },
      },
    });
    if (!v) throw new ErreurMetier("Véhicule introuvable.");
    const liens = Object.values(v._count).reduce((a, b) => a + b, 0);
    if (liens > 0) throw new ErreurMetier("Ce véhicule a des dépenses, contrats ou mouvements : archivez-le plutôt.");

    await db.$transaction(async (tx) => {
      await tx.vehicule.delete({ where: { id } }); // participations, photos, historique : supprimés en cascade
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Vehicule", entiteId: id, avant: v }, tx);
    });
    for (const f of v.fichiers) await supprimerFichierStocke(f.cleStockage);
    rafraichir();
    return { ok: true, message: "Véhicule supprimé." };
  });
}

// ---------------------------------------------------------------------
//  Photos et documents
// ---------------------------------------------------------------------

export async function envoyerPhotoVehicule(formulaire: FormData) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const vehiculeId = String(formulaire.get("vehiculeId") ?? "");
    const fichier = formulaire.get("photo");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucune photo reçue.");
    await vehiculeExistant(vehiculeId);

    const existantes = await db.fichier.aggregate({
      where: { vehiculeId, categorie: "PHOTO_VEHICULE" },
      _count: true,
      _max: { ordre: true },
    });
    const photo = await enregistrerFichier({
      fichier,
      categorie: "PHOTO_VEHICULE",
      typesAutorises: TYPES_IMAGES,
      proprietaire: { vehiculeId },
      utilisateurId: u.id,
      ordre: (existantes._max.ordre ?? 0) + 1,
      estPrincipale: existantes._count === 0, // la première photo devient la photo principale
    });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "PhotoVehicule", entiteId: vehiculeId, apres: { fichierId: photo.id } });
    rafraichir(vehiculeId);
    return { ok: true, donnees: { id: photo.id } };
  });
}

export async function definirPhotoPrincipale(fichierId: string) {
  return avecDroits(ROLES_GESTION, async () => {
    const photo = await db.fichier.findUnique({ where: { id: fichierId } });
    if (!photo?.vehiculeId || photo.categorie !== "PHOTO_VEHICULE") throw new ErreurMetier("Photo introuvable.");
    await db.$transaction([
      db.fichier.updateMany({ where: { vehiculeId: photo.vehiculeId, categorie: "PHOTO_VEHICULE" }, data: { estPrincipale: false } }),
      db.fichier.update({ where: { id: fichierId }, data: { estPrincipale: true } }),
    ]);
    rafraichir(photo.vehiculeId);
    return { ok: true, message: "Photo principale définie." };
  });
}

export async function envoyerDocumentVehicule(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const vehiculeId = String(formulaire.get("vehiculeId") ?? "");
    const categorie = String(formulaire.get("categorie") ?? "");
    const libelle = String(formulaire.get("libelle") ?? "").trim().slice(0, 120) || null;
    const fichier = formulaire.get("document");
    if (!(CATEGORIES_DOCUMENTS_VEHICULE as readonly string[]).includes(categorie)) throw new ErreurMetier("Type de document invalide.");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucun fichier reçu.");
    await vehiculeExistant(vehiculeId);

    const doc = await enregistrerFichier({
      fichier,
      categorie: categorie as CategorieFichier,
      typesAutorises: TYPES_DOCUMENTS,
      proprietaire: { vehiculeId },
      utilisateurId: u.id,
      libelle,
    });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "DocumentVehicule", entiteId: vehiculeId, apres: { fichierId: doc.id, categorie } });
    rafraichir(vehiculeId);
    return { ok: true, message: "Document ajouté." };
  });
}

/** Supprime une photo ou un document d'un véhicule. */
export async function supprimerFichierVehicule(fichierId: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const fichier = await db.fichier.findUnique({ where: { id: fichierId } });
    if (!fichier?.vehiculeId) throw new ErreurMetier("Fichier introuvable.");
    const vehiculeId = fichier.vehiculeId;
    await db.$transaction(async (tx) => {
      await tx.fichier.delete({ where: { id: fichierId } });
      // Si c'était la photo principale, la suivante prend sa place.
      if (fichier.estPrincipale) {
        const suivante = await tx.fichier.findFirst({
          where: { vehiculeId, categorie: "PHOTO_VEHICULE" },
          orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
        });
        if (suivante) await tx.fichier.update({ where: { id: suivante.id }, data: { estPrincipale: true } });
      }
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "FichierVehicule", entiteId: vehiculeId, avant: fichier }, tx);
    });
    await supprimerFichierStocke(fichier.cleStockage);
    rafraichir(vehiculeId);
    return { ok: true, message: fichier.categorie === "PHOTO_VEHICULE" ? "Photo supprimée." : "Document supprimé." };
  });
}

// ---------------------------------------------------------------------
//  Valeur estimée (datée)
// ---------------------------------------------------------------------

export async function ajouterEstimation(vehiculeId: string, saisie: SaisieEstimation) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaEstimation.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    await vehiculeExistant(vehiculeId);
    const { montant, ...reste } = lecture.data;
    const e = await db.estimationValeur.create({ data: { vehiculeId, montantCentimes: montant, ...reste } });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "EstimationValeur", entiteId: e.id, apres: e });
    rafraichir(vehiculeId);
    return { ok: true, message: "Valeur estimée enregistrée." };
  });
}

export async function supprimerEstimation(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const e = await db.estimationValeur.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "EstimationValeur", entiteId: id, avant: e });
    rafraichir(e.vehiculeId);
    return { ok: true, message: "Estimation supprimée." };
  });
}

// ---------------------------------------------------------------------
//  Répartition du bénéfice, vente
// ---------------------------------------------------------------------

export async function enregistrerParametresRepartition(vehiculeId: string, saisie: SaisieParametresRepartition) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaParametresRepartition.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = await db.vehicule.findUnique({
      where: { id: vehiculeId },
      select: { modeRepartition: true, commissionGestionBp: true, partsFixes: true },
    });
    if (!avant) throw new ErreurMetier("Véhicule introuvable.");
    if (d.mode === "POURCENTAGE_FIXE") await verifierFinanceurs(d.partsFixes.map((p) => p.partenaireId));

    await db.$transaction(async (tx) => {
      await tx.vehicule.update({ where: { id: vehiculeId }, data: { modeRepartition: d.mode, commissionGestionBp: d.commission } });
      await tx.partBeneficeFixe.deleteMany({ where: { vehiculeId } });
      if (d.mode === "POURCENTAGE_FIXE") {
        await tx.partBeneficeFixe.createMany({
          data: d.partsFixes.filter((p) => p.pourcentage > 0).map((p) => ({ vehiculeId, partenaireId: p.partenaireId, pourcentageBp: p.pourcentage })),
        });
      }
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Repartition", entiteId: vehiculeId, avant, apres: d }, tx);
    });
    rafraichir(vehiculeId);
    return { ok: true, message: "Règles de répartition enregistrées." };
  });
}

export async function marquerVendu(vehiculeId: string, saisie: SaisieVente) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaVente.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const v = await vehiculeExistant(vehiculeId);
    if (v.statut === "VENDU") throw new ErreurMetier("Ce véhicule est déjà vendu.");
    if (v.statut === "ARCHIVE") throw new ErreurMetier("Restaurez d'abord ce véhicule archivé.");
    await sansLocationActive(vehiculeId, "le vendre");
    if (d.dateVente < v.dateAchat) {
      return { ok: false, message: "La date de vente est antérieure à la date d'achat.", erreursChamps: { dateVente: ["Antérieure à la date d'achat."] } };
    }
    if (d.kilometrageVente !== null && v.kilometrageAchat !== null && d.kilometrageVente < v.kilometrageAchat) {
      return { ok: false, message: "Kilométrage inférieur à celui de l'achat.", erreursChamps: { kilometrageVente: ["Inférieur au kilométrage à l'achat."] } };
    }

    await db.$transaction(async (tx) => {
      await tx.vehicule.update({
        where: { id: vehiculeId },
        data: {
          statut: "VENDU",
          prixVenteCentimes: d.prixVente,
          dateVente: d.dateVente,
          kilometrageVente: d.kilometrageVente,
          kilometrageActuel: d.kilometrageVente ?? v.kilometrageActuel,
          acheteurNom: d.acheteurNom,
          acheteurTelephone: d.acheteurTelephone,
          acheteurEmail: d.acheteurEmail,
          acheteurAdresse: d.acheteurAdresse,
          modePaiementVente: d.modePaiementVente,
          notesVente: d.notesVente,
        },
      });
      await tx.historiqueStatutVehicule.create({
        data: { vehiculeId, ancienStatut: v.statut, nouveauStatut: "VENDU", motif: `Vendu ${formatEuros(d.prixVente)}`, utilisateurId: u.id },
      });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Vente", entiteId: vehiculeId, avant: v, apres: d }, tx);
    });
    rafraichir(vehiculeId);
    return { ok: true, message: "Véhicule marqué comme vendu." };
  });
}

/** Annule une vente saisie par erreur : le véhicule retrouve son statut précédent. */
export async function annulerVente(vehiculeId: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const v = await vehiculeExistant(vehiculeId);
    if (v.statut !== "VENDU") throw new ErreurMetier("Ce véhicule n'est pas vendu.");
    if (await db.facture.findFirst({ where: { vehiculeId, type: "VENTE_VEHICULE", annuleeLe: null }, select: { id: true } })) {
      throw new ErreurMetier("Une facture de vente a été émise : annulez-la d'abord (fiche du véhicule, carte Vente).");
    }
    const vente = await db.historiqueStatutVehicule.findFirst({ where: { vehiculeId, nouveauStatut: "VENDU" }, orderBy: { changeLe: "desc" } });
    const statut = vente?.ancienStatut && !["VENDU", "ARCHIVE"].includes(vente.ancienStatut) ? vente.ancienStatut : "EN_VENTE";
    await db.$transaction(async (tx) => {
      await tx.vehicule.update({
        where: { id: vehiculeId },
        data: {
          statut, prixVenteCentimes: null, dateVente: null, kilometrageVente: null, acheteurNom: null, acheteurTelephone: null,
          acheteurEmail: null, acheteurAdresse: null, modePaiementVente: null, notesVente: null,
        },
      });
      await tx.historiqueStatutVehicule.create({ data: { vehiculeId, ancienStatut: "VENDU", nouveauStatut: statut, motif: "Vente annulée", utilisateurId: u.id } });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "AnnulationVente", entiteId: vehiculeId, avant: v }, tx);
    });
    rafraichir(vehiculeId);
    return { ok: true, message: "Vente annulée." };
  });
}

