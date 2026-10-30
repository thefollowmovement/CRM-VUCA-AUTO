"use server";

import { revalidatePath } from "next/cache";
import type { CategorieFichier, ModePaiement, StatutVehicule } from "@/generated/prisma/enums";
import { comparerEtatsDesLieux, montantRetenu } from "@/lib/calculs/etat-des-lieux";
import { db } from "@/lib/db";
import { formatEuros, parseEurosEnCentimes } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { libelleDommage, type TypeDommage, type Vue } from "@/lib/schema-vehicule";
import { enregistrerFichier, supprimerFichierStocke, TYPES_IMAGES } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import {
  CATEGORIES_PHOTOS_EDL,
  CATEGORIES_PHOTOS_OBLIGATOIRES,
  PHOTOS_GUIDEES,
  schemaDommage,
  schemaEtatDesLieux,
  type SaisieEtatDesLieux,
} from "@/lib/validations/etat-des-lieux";

function rafraichir(contratId: string, vehiculeId: string) {
  revalidatePath("/location", "layout");
  revalidatePath(`/vehicules/${vehiculeId}`, "layout");
  revalidatePath("/vehicules");
  revalidatePath(`/location/contrats/${contratId}`, "layout");
}

async function edlModifiable(id: string) {
  const edl = await db.etatDesLieux.findUnique({ where: { id }, include: { contrat: { select: { id: true, vehiculeId: true, statut: true, numero: true } } } });
  if (!edl) throw new ErreurMetier("État des lieux introuvable.");
  if (edl.verrouille) throw new ErreurMetier("Cet état des lieux est signé : il ne peut plus être modifié.");
  return edl;
}

// ---------------------------------------------------------------------
//  Photos (envoyées une par une pendant l'état des lieux)
// ---------------------------------------------------------------------

export async function envoyerPhotoEdl(formulaire: FormData) {
  return avecDroits<{ id: string; categorie: string }>(ROLES_GESTION, async (u) => {
    const edlId = String(formulaire.get("etatDesLieuxId") ?? "");
    const categorie = String(formulaire.get("categorie") ?? "");
    const photo = formulaire.get("photo");
    if (!(CATEGORIES_PHOTOS_EDL as readonly string[]).includes(categorie)) throw new ErreurMetier("Type de photo invalide.");
    if (!(photo instanceof File)) throw new ErreurMetier("Aucune photo reçue.");
    const edl = await edlModifiable(edlId);
    // Une seule photo par vue guidée : la nouvelle remplace l'ancienne
    const anciennes = categorie === "EDL_LIBRE" ? [] : await db.fichier.findMany({ where: { etatDesLieuxId: edlId, categorie: categorie as CategorieFichier } });
    const f = await enregistrerFichier({ fichier: photo, categorie: categorie as CategorieFichier, typesAutorises: TYPES_IMAGES, proprietaire: { etatDesLieuxId: edlId }, utilisateurId: u.id });
    for (const a of anciennes) {
      await db.fichier.delete({ where: { id: a.id } });
      await supprimerFichierStocke(a.cleStockage);
    }
    rafraichir(edl.contrat.id, edl.contrat.vehiculeId);
    return { ok: true, donnees: { id: f.id, categorie } };
  });
}

export async function supprimerPhotoEdl(fichierId: string) {
  return avecDroits(ROLES_GESTION, async () => {
    const f = await db.fichier.findUnique({ where: { id: fichierId } });
    if (!f?.etatDesLieuxId) throw new ErreurMetier("Photo introuvable.");
    await edlModifiable(f.etatDesLieuxId);
    await db.fichier.delete({ where: { id: fichierId } });
    await supprimerFichierStocke(f.cleStockage);
    return { ok: true, message: "Photo supprimée." };
  });
}

// ---------------------------------------------------------------------
//  Dommages (touchés sur le schéma)
// ---------------------------------------------------------------------

export async function ajouterDommage(formulaire: FormData) {
  return avecDroits<{ id: string; photoId: string | null }>(ROLES_GESTION, async (u) => {
    let donnees: unknown;
    try {
      donnees = JSON.parse(String(formulaire.get("donnees") ?? "{}"));
    } catch {
      throw new ErreurMetier("Données invalides.");
    }
    const lecture = schemaDommage.safeParse(donnees);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const vehicule = await db.vehicule.findUnique({ where: { id: d.vehiculeId }, select: { id: true } });
    if (!vehicule) throw new ErreurMetier("Véhicule introuvable.");
    let contratId: string | null = null;
    if (d.etatDesLieuxId) {
      const edl = await edlModifiable(d.etatDesLieuxId);
      if (edl.contrat.vehiculeId !== d.vehiculeId) throw new ErreurMetier("Ce dommage ne concerne pas le véhicule de la location.");
      contratId = edl.contrat.id;
    }
    const dommage = await db.dommage.create({
      data: {
        vehiculeId: d.vehiculeId, etatDesLieuxConstatationId: d.etatDesLieuxId, vue: d.vue as Vue, zone: d.zone, positionX: d.positionX, positionY: d.positionY,
        type: d.type as TypeDommage, gravite: d.gravite as "LEGER", description: d.description,
      },
    });
    let photoId: string | null = null;
    const photo = formulaire.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const f = await enregistrerFichier({ fichier: photo, categorie: "PHOTO_DOMMAGE", typesAutorises: TYPES_IMAGES, proprietaire: { dommageId: dommage.id }, utilisateurId: u.id });
      photoId = f.id;
    }
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Dommage", entiteId: dommage.id, apres: dommage });
    if (contratId) revalidatePath(`/location/contrats/${contratId}`, "layout");
    revalidatePath(`/vehicules/${d.vehiculeId}`, "layout");
    return { ok: true, message: "Dommage ajouté.", donnees: { id: dommage.id, photoId } };
  });
}

export async function supprimerDommage(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const d = await db.dommage.findUnique({
      where: { id },
      include: { etatDesLieuxConstatation: { select: { verrouille: true } }, photos: { select: { cleStockage: true } }, _count: { select: { frais: true } } },
    });
    if (!d) throw new ErreurMetier("Dommage introuvable.");
    if (d.etatDesLieuxConstatation?.verrouille) throw new ErreurMetier("Ce dommage figure dans un état des lieux signé : marquez-le plutôt comme réparé.");
    if (d._count.frais > 0) throw new ErreurMetier("Ce dommage a été facturé : il ne peut pas être supprimé.");
    await db.dommage.delete({ where: { id } });
    for (const p of d.photos) await supprimerFichierStocke(p.cleStockage);
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Dommage", entiteId: id, avant: d });
    revalidatePath(`/vehicules/${d.vehiculeId}`, "layout");
    return { ok: true, message: "Dommage supprimé." };
  });
}

/** Réparation : le dommage disparaît des états des lieux suivants. */
export async function marquerDommageRepare(id: string, repare: boolean) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const d = await db.dommage.findUnique({ where: { id } });
    if (!d) throw new ErreurMetier("Dommage introuvable.");
    await db.dommage.update({ where: { id }, data: { repareLe: repare ? new Date() : null } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Dommage", entiteId: id, avant: { repareLe: d.repareLe }, apres: { repare } });
    revalidatePath(`/vehicules/${d.vehiculeId}`, "layout");
    return { ok: true, message: repare ? "Dommage marqué comme réparé." : "Réparation annulée." };
  });
}

// ---------------------------------------------------------------------
//  Validation finale (signatures) : départ ou retour
// ---------------------------------------------------------------------

const MODE_PAIEMENT_CAUTION: Record<string, ModePaiement> = { EMPREINTE_CB: "CARTE_BANCAIRE", CHEQUE: "CHEQUE", ESPECES: "ESPECES", VIREMENT: "VIREMENT" };

export async function validerEtatDesLieux(edlId: string, saisie: SaisieEtatDesLieux, signatures: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaEtatDesLieux.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const edl = await db.etatDesLieux.findUnique({
      where: { id: edlId },
      include: {
        photos: { select: { categorie: true } },
        contrat: { include: { vehicule: { select: { id: true, statut: true, kilometrageActuel: true } }, etatsDesLieux: { include: { checklist: true } } } },
      },
    });
    if (!edl) throw new ErreurMetier("État des lieux introuvable.");
    if (edl.verrouille) throw new ErreurMetier("Cet état des lieux est déjà signé.");
    const c = edl.contrat;
    const km = d.kilometrage!;

    // Photos obligatoires
    const presentes = new Set(edl.photos.map((p) => p.categorie));
    const manquantes = CATEGORIES_PHOTOS_OBLIGATOIRES.filter((cat) => !presentes.has(cat as CategorieFichier));
    if (manquantes.length > 0) {
      const noms = manquantes.map((m) => (m === "EDL_COMPTEUR" ? "compteur" : (PHOTOS_GUIDEES.find((p) => p.categorie === m)?.libelle.toLowerCase() ?? m)));
      throw new ErreurMetier(`Photos manquantes : ${noms.join(", ")}.`);
    }

    // Signatures
    const sigClient = signatures.get("signatureClient");
    const sigLoueur = signatures.get("signatureLoueur");
    if (!(sigClient instanceof File) || sigClient.size === 0) throw new ErreurMetier("La signature du client est obligatoire.");
    if (!(sigLoueur instanceof File) || sigLoueur.size === 0) throw new ErreurMetier("La signature du loueur est obligatoire.");

    const depart = c.etatsDesLieux.find((e) => e.type === "DEPART");
    if (edl.type === "DEPART") {
      if (!["RESERVATION", "CONFIRMEE"].includes(c.statut)) throw new ErreurMetier("Le départ de cette location a déjà été fait.");
      if (["IMMOBILISE", "VENDU", "ARCHIVE"].includes(c.vehicule.statut)) throw new ErreurMetier("Ce véhicule ne peut pas partir en location.");
      const encore = await db.contratLocation.findFirst({ where: { vehiculeId: c.vehiculeId, statut: "EN_COURS", id: { not: c.id } }, select: { numero: true } });
      if (encore) throw new ErreurMetier(`Le véhicule n'est pas encore revenu de la location ${encore.numero}.`);
    } else {
      if (c.statut !== "EN_COURS") throw new ErreurMetier("Cette location n'est pas en cours.");
      if (!depart?.verrouille) throw new ErreurMetier("L'état des lieux de départ est introuvable.");
      if (km < depart.kilometrage) {
        return { ok: false, message: "Kilométrage inférieur à celui du départ.", erreursChamps: { kilometrage: [`Minimum ${depart.kilometrage} km (départ).`] } };
      }
    }

    // Caution (retour)
    let retenue = 0;
    if (edl.type === "RETOUR" && c.cautionCentimes > 0) {
      if (!d.decisionCaution) return { ok: false, message: "Indiquez ce que devient la caution.", erreursChamps: { decisionCaution: ["Choix obligatoire."] } };
      const partiel = parseEurosEnCentimes(d.montantRetenu);
      if (d.decisionCaution === "RETENUE_PARTIELLE" && (partiel === null || partiel <= 0)) {
        return { ok: false, message: "Indiquez le montant retenu.", erreursChamps: { montantRetenu: ["Montant obligatoire."] } };
      }
      retenue = montantRetenu(c.cautionCentimes, d.decisionCaution, partiel);
      if (retenue > 0 && !d.motifRetenue) return { ok: false, message: "Indiquez le motif de la retenue.", erreursChamps: { motifRetenue: ["Motif obligatoire."] } };
    }

    // Dommages constatés pendant ce retour (pour lier les frais)
    const dommagesEdl = new Set((await db.dommage.findMany({ where: { etatDesLieuxConstatationId: edl.id }, select: { id: true } })).map((x) => x.id));

    // Fichiers de signature (PNG d'origine, non recompressés)
    const enregistrerSignature = (f: File, qui: string) =>
      enregistrerFichier({ fichier: f, categorie: "SIGNATURE", typesAutorises: ["image/png"], optimiser: false, proprietaire: { etatDesLieuxId: edl.id }, utilisateurId: u.id, libelle: qui });
    const [fClient, fLoueur] = await Promise.all([enregistrerSignature(sigClient, "Client"), enregistrerSignature(sigLoueur, "Loueur")]);

    const maintenant = new Date();
    await db.$transaction(async (tx) => {
      await tx.ligneChecklistEdl.deleteMany({ where: { etatDesLieuxId: edl.id } });
      await tx.etatDesLieux.update({
        where: { id: edl.id },
        data: {
          realiseLe: maintenant, realiseParId: u.id, kilometrage: km, niveauCarburantHuitiemes: d.niveauCarburantHuitiemes, niveauBatteriePct: d.niveauBatteriePct,
          propreteInterieure: d.propreteInterieure, propreteExterieure: d.propreteExterieure, remarques: d.remarques,
          signatureClientId: fClient.id, signatureLoueurId: fLoueur.id, nomSignataireClient: d.nomSignataireClient, signeLe: maintenant, verrouille: true,
          checklist: { create: d.checklist.map((l) => ({ elementId: l.elementId, libelle: l.libelle, present: l.present, quantite: l.quantite })) },
        },
      });

      // Kilométrage du véhicule
      const majKm = km > (c.vehicule.kilometrageActuel ?? -1) ? { kilometrageActuel: km, kilometrageActuelLe: maintenant } : {};

      if (edl.type === "DEPART") {
        await tx.contratLocation.update({
          where: { id: c.id },
          data: {
            statut: "EN_COURS", departReelLe: maintenant,
            ...(d.cautionEncaissee && c.cautionCentimes > 0 ? { statutCaution: "ENCAISSEE", cautionEncaisseeLe: maintenant } : {}),
          },
        });
        await tx.vehicule.update({ where: { id: c.vehiculeId }, data: { statut: "EN_LOCATION", ...majKm } });
        await tx.historiqueStatutVehicule.create({
          data: { vehiculeId: c.vehiculeId, ancienStatut: c.vehicule.statut, nouveauStatut: "EN_LOCATION", motif: `Départ ${c.numero}`, utilisateurId: u.id },
        });
      } else {
        // Frais validés par l'utilisateur
        for (const f of d.frais) {
          await tx.fraisSupplementaire.create({
            data: {
              contratId: c.id, type: f.type, libelle: f.libelle, quantite: f.quantite, prixUnitaireCentimes: f.prixUnitaire, montantCentimes: f.quantite * f.prixUnitaire,
              proposeAutomatiquement: true, dommageId: f.dommageId && dommagesEdl.has(f.dommageId) ? f.dommageId : null,
            },
          });
        }
        // Caution : restituée et/ou retenue (la part retenue est un revenu du véhicule)
        if (c.cautionCentimes > 0 && d.decisionCaution) {
          await tx.contratLocation.update({
            where: { id: c.id },
            data: {
              statutCaution: d.decisionCaution, cautionRetenueCentimes: retenue, motifRetenueCaution: retenue > 0 ? d.motifRetenue : null,
              cautionRestitueeLe: retenue < c.cautionCentimes ? maintenant : null,
            },
          });
          if (retenue > 0) {
            await tx.paiement.create({
              data: {
                contratId: c.id, nature: "CAUTION_RETENUE", date: new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())),
                montantCentimes: retenue, mode: MODE_PAIEMENT_CAUTION[c.modeCaution ?? ""] ?? "AUTRE", note: `Caution retenue : ${d.motifRetenue ?? ""}`.trim(),
              },
            });
          }
        }
        await tx.contratLocation.update({ where: { id: c.id }, data: { statut: "TERMINEE", retourReelLe: maintenant } });
        // Le véhicule retrouve le statut qu'il avait avant le départ
        const avantDepart = await tx.historiqueStatutVehicule.findFirst({ where: { vehiculeId: c.vehiculeId, nouveauStatut: "EN_LOCATION" }, orderBy: { changeLe: "desc" } });
        const statuts: StatutVehicule[] = ["DISPONIBLE_LOCATION", "EN_VENTE", "RESERVE", "EN_PREPARATION"];
        const nouveau: StatutVehicule = avantDepart?.ancienStatut && statuts.includes(avantDepart.ancienStatut) ? avantDepart.ancienStatut : "DISPONIBLE_LOCATION";
        await tx.vehicule.update({ where: { id: c.vehiculeId }, data: { statut: nouveau, ...majKm } });
        await tx.historiqueStatutVehicule.create({
          data: { vehiculeId: c.vehiculeId, ancienStatut: c.vehicule.statut, nouveauStatut: nouveau, motif: `Retour ${c.numero}`, utilisateurId: u.id },
        });
      }
      await journaliser(
        {
          utilisateurId: u.id, action: "MODIFICATION", entite: edl.type === "DEPART" ? "DepartLocation" : "RetourLocation", entiteId: c.id,
          apres: { kilometrage: km, frais: d.frais, caution: d.decisionCaution, retenue },
        },
        tx,
      );
    });
    rafraichir(c.id, c.vehiculeId);
    return {
      ok: true,
      message:
        edl.type === "DEPART"
          ? `Départ enregistré : ${c.numero} est en cours.`
          : `Retour enregistré${retenue > 0 ? ` (caution retenue : ${formatEuros(retenue)})` : ""}. La location est terminée.`,
    };
  });
}

/** Comparaison départ / retour calculée côté serveur (aperçu dans l'assistant de retour). */
export async function apercuComparaison(edlId: string, releve: { kilometrage: number; niveauCarburantHuitiemes: number | null; niveauBatteriePct: number | null; propreteInterieure: "PROPRE" | "CORRECT" | "SALE" | null; propreteExterieure: "PROPRE" | "CORRECT" | "SALE" | null; checklist: { libelle: string; present: boolean; quantite: number | null }[] }) {
  return avecDroits<ReturnType<typeof comparerEtatsDesLieux>>(ROLES_GESTION, async () => {
    const edl = await db.etatDesLieux.findUnique({ where: { id: edlId }, include: { contrat: { include: { etatsDesLieux: { include: { checklist: true } } } } } });
    if (!edl || edl.type !== "RETOUR") throw new ErreurMetier("État des lieux de retour introuvable.");
    const depart = edl.contrat.etatsDesLieux.find((e) => e.type === "DEPART");
    if (!depart) throw new ErreurMetier("État des lieux de départ introuvable.");
    const [reglages, nouveaux] = await Promise.all([
      lireReglages(),
      db.dommage.findMany({ where: { etatDesLieuxConstatationId: edl.id }, orderBy: { constateLe: "asc" }, select: { id: true, type: true, vue: true, zone: true } }),
    ]);
    const c = edl.contrat;
    return {
      ok: true,
      donnees: comparerEtatsDesLieux({
        contrat: c,
        depart: { ...depart, checklist: depart.checklist },
        retour: releve,
        retourReelLe: new Date(),
        reglages,
        nouveauxDommages: nouveaux.map((n) => ({ id: n.id, libelle: libelleDommage({ type: n.type as TypeDommage, vue: n.vue as Vue, zone: n.zone }) })),
      }),
    };
  });
}
