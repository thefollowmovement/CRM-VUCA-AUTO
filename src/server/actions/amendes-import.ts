"use server";
// Module Amendes : dépôt des scans, corrections, choix du contrat, validation en lot.

import { revalidatePath } from "next/cache";
import { motifRefusValidation, normaliserPlaque } from "@/lib/calculs/amendes";
import { jourParisISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { detecterType } from "@/lib/images";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier } from "@/lib/storage";
import { schemaCorrectionAmende, type SaisieCorrectionAmende } from "@/lib/validations/amendes";
import { erreurValidation } from "@/lib/validations/erreurs";
import { decouperPages } from "@/server/amendes/decoupage";
import { reveillerLectureAmendes } from "@/server/amendes/file";
import { evaluerAmende, instantInfraction } from "@/server/amendes/traitement";

/** Taille maximale d'un fichier déposé (un PDF de plusieurs avis) : limite du relais HTTPS du serveur. */
const TAILLE_MAX_DEPOT = 20 * 1024 * 1024;
const MESSAGE_HEIC =
  "Photo iPhone (HEIC) illisible par le serveur. Envoyez-la en JPEG : sur l'iPhone, Réglages › Appareil photo › Formats › « Le plus compatible », ou partagez la photo par mail en taille réelle.";

function rafraichir() {
  revalidatePath("/location/amendes", "layout");
  revalidatePath("/dashboard");
}

/**
 * Dépose UN fichier (l'écran envoie les fichiers un par un) : chaque page devient un PV « à lire ».
 * `lotId` vide = nouveau lot. La lecture par Claude démarre aussitôt, en tâche de fond.
 */
export async function importerAvis(formulaire: FormData) {
  return avecDroits<{ lotId: string; pages: number }>(ROLES_GESTION, async (u) => {
    const fichier = formulaire.get("fichier");
    if (!(fichier instanceof File) || fichier.size === 0) throw new ErreurMetier("Aucun fichier reçu.");
    if (fichier.size > TAILLE_MAX_DEPOT) throw new ErreurMetier(`« ${fichier.name} » est trop volumineux (20 Mo maximum) : scannez-le en plusieurs fichiers.`);
    const contenu = Buffer.from(await fichier.arrayBuffer());
    const type = detecterType(contenu);
    if (!type || !["application/pdf", "image/jpeg", "image/png", "image/heic"].includes(type)) {
      throw new ErreurMetier(`« ${fichier.name} » : format non accepté (PDF, JPG, PNG ou HEIC).`);
    }

    let pages;
    try {
      pages = await decouperPages(contenu, type);
    } catch (e) {
      throw new ErreurMetier(`« ${fichier.name} » : ${e instanceof Error ? e.message : "fichier illisible."}`);
    }

    const lotIdRecu = String(formulaire.get("lotId") ?? "");
    const lot = lotIdRecu ? await db.lotImportAmendes.findUnique({ where: { id: lotIdRecu } }) : await db.lotImportAmendes.create({ data: { creeParId: u.id } });
    if (!lot) throw new ErreurMetier("Lot d'import introuvable.");

    const base = fichier.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 150) || "avis";
    let creees = 0;
    for (const p of pages) {
      const amende = await db.amende.create({ data: { statut: "A_LIRE", lotImportId: lot.id, fichierPage: p.page, creeParId: u.id } });
      try {
        const nom = p.nbPages > 1 ? `${base} – page ${p.page}.pdf` : fichier.name;
        await enregistrerFichier({ fichier: new File([new Uint8Array(p.contenu)], nom, { type: p.typeMime }), categorie: "AVIS_CONTRAVENTION", proprietaire: { amendeId: amende.id }, utilisateurId: u.id });
        creees++;
      } catch (e) {
        await db.amende.delete({ where: { id: amende.id } });
        if (type === "image/heic") throw new ErreurMetier(MESSAGE_HEIC);
        throw e;
      }
    }
    await db.lotImportAmendes.update({ where: { id: lot.id }, data: { nbFichiers: { increment: 1 }, nbPages: { increment: creees } } });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "LotImportAmendes", entiteId: lot.id, apres: { fichier: fichier.name, pages: creees } });
    reveillerLectureAmendes();
    rafraichir();
    return { ok: true, message: `« ${fichier.name} » : ${creees} page${creees > 1 ? "s" : ""} déposée${creees > 1 ? "s" : ""}.`, donnees: { lotId: lot.id, pages: creees } };
  });
}

/** Statuts dans lesquels les champs restent modifiables depuis l'écran de validation. */
const MODIFIABLES = ["A_VALIDER", "A_DESIGNER", "RECUE", "IGNORE"] as const;

/**
 * Enregistre les champs corrigés (ou simplement relus) d'un PV : ils ne sont plus signalés « à relire ».
 * Si la plaque ou la date / l'heure change, le rapprochement avec la location est relancé.
 */
export async function corrigerAmende(id: string, saisie: SaisieCorrectionAmende) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaCorrectionAmende.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = await db.amende.findUnique({ where: { id } });
    if (!avant) throw new ErreurMetier("PV introuvable.");
    if (!(MODIFIABLES as readonly string[]).includes(avant.statut)) throw new ErreurMetier("Ce PV n'est plus modifiable ici.");

    const dateISO = d.dateInfraction ? d.dateInfraction.toISOString().slice(0, 10) : null;
    const instant = instantInfraction(dateISO, d.heureInfraction);
    const plaque = normaliserPlaque(d.immatriculation);
    const changeRapprochement = plaque !== avant.immatriculationLue || instant?.date.getTime() !== avant.infractionLe?.getTime() || (instant?.heureInconnue ?? false) !== avant.heureInconnue;

    await db.amende.update({
      where: { id },
      data: {
        numeroAvis: d.numeroAvis,
        dateAvis: d.dateAvis,
        infractionLe: instant?.date ?? null,
        heureInconnue: instant?.heureInconnue ?? false,
        immatriculationLue: plaque,
        nature: d.nature,
        lieu: d.lieu,
        montantCentimes: d.montant,
        // L'utilisateur a relu les champs à côté du scan : plus de « à relire ».
        champsVerifies: ["numero_avis", "date_avis", "date_infraction", "heure_infraction", "immatriculation"],
        ...(changeRapprochement ? { identificationAuto: true } : {}),
      },
    });
    await evaluerAmende(db, id);
    const apres = await db.amende.findUnique({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, avant: champsJournal(avant), apres: champsJournal(apres) });
    rafraichir();
    return { ok: true, message: changeRapprochement ? "Corrections enregistrées, rapprochement relancé." : "Champs confirmés." };
  });
}

/** Choix du locataire : `auto` (rapprochement automatique), `societe` (aucun, payé par la société) ou un contrat du véhicule. */
export async function choisirContratAmende(id: string, choix: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const a = await db.amende.findUnique({ where: { id } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (!(MODIFIABLES as readonly string[]).includes(a.statut)) throw new ErreurMetier("Ce PV n'est plus modifiable ici.");
    let data: { identificationAuto: boolean; contratId: string | null; clientId: string | null };
    if (choix === "auto") data = { identificationAuto: true, contratId: null, clientId: null };
    else if (choix === "societe") data = { identificationAuto: false, contratId: null, clientId: null };
    else {
      const c = await db.contratLocation.findUnique({ where: { id: choix }, select: { id: true, vehiculeId: true, clientId: true } });
      if (!c || c.vehiculeId !== a.vehiculeId) throw new ErreurMetier("Ce contrat ne concerne pas le véhicule du PV.");
      data = { identificationAuto: false, contratId: c.id, clientId: c.clientId };
    }
    await db.amende.update({ where: { id }, data });
    await evaluerAmende(db, id);
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, avant: { contratId: a.contratId, clientId: a.clientId }, apres: { ...data, choix } });
    rafraichir();
    return { ok: true, message: choix === "societe" ? "PV marqué « payé par la société » (à valider)." : choix === "auto" ? "Rapprochement automatique relancé." : "Locataire choisi." };
  });
}

export type RefusValidation = { id: string; numero: string | null; motif: string; clientId: string | null };

/**
 * « Valider la sélection » : PV → « à désigner » (ou « payé par la société » si ce choix a été fait).
 * Refusé, ligne par ligne, sans locataire ou avec une fiche client incomplète.
 */
export async function validerAmendes(ids: string[]) {
  return avecDroits<{ refus: RefusValidation[]; valides: number }>(ROLES_GESTION, async (u) => {
    if (!Array.isArray(ids) || ids.length === 0) throw new ErreurMetier("Cochez au moins un PV.");
    const amendes = await db.amende.findMany({
      where: { id: { in: ids.slice(0, 200) }, statut: { in: ["A_VALIDER", "RECUE"] } },
      include: { client: { select: { nom: true, prenom: true, dateNaissance: true, adresse: true, codePostal: true, ville: true, numeroPermis: true, dateDelivrancePermis: true, dateObtentionPermis: true } } },
    });
    const refus: RefusValidation[] = [];
    let aDesigner = 0;
    let parSociete = 0;
    for (const a of amendes) {
      const societe = !a.identificationAuto && !a.contratId;
      if (societe) {
        await db.amende.update({ where: { id: a.id }, data: { statut: "PAYEE" } });
        parSociete++;
      } else {
        const motif = motifRefusValidation(a);
        if (motif) {
          refus.push({ id: a.id, numero: a.numeroAvis, motif, clientId: a.clientId });
          continue;
        }
        await db.amende.update({ where: { id: a.id }, data: { statut: "A_DESIGNER" } });
        aDesigner++;
      }
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: a.id, avant: { statut: a.statut }, apres: { statut: societe ? "PAYEE" : "A_DESIGNER", validation: jourParisISO(new Date()) } });
    }
    rafraichir();
    const morceaux = [aDesigner && `${aDesigner} PV à désigner`, parSociete && `${parSociete} payé${parSociete > 1 ? "s" : ""} par la société`, refus.length && `${refus.length} refusé${refus.length > 1 ? "s" : ""}`].filter(Boolean);
    // Rien de validé : pas de message de succès, l'écran affiche les motifs (avec le lien vers la fiche client).
    if (aDesigner + parSociete === 0) {
      if (!refus.length) throw new ErreurMetier("Ces PV ne sont plus à valider.");
      return { ok: true, donnees: { refus, valides: 0 } };
    }
    return { ok: true, message: `${morceaux.join(", ")}.`, donnees: { refus, valides: aDesigner + parSociete } };
  });
}

/** Relance la lecture automatique d'un PV (après un échec, ou une clé API ajoutée entre-temps). */
export async function relancerLectureAmende(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const a = await db.amende.findUnique({ where: { id }, select: { statut: true, _count: { select: { fichiers: true } } } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (a._count.fichiers === 0) throw new ErreurMetier("Ce PV n'a pas de scan à lire.");
    if (!["A_VALIDER", "IGNORE", "A_LIRE"].includes(a.statut)) throw new ErreurMetier("Ce PV a déjà été validé.");
    await db.amende.update({ where: { id }, data: { statut: "A_LIRE", ocrEnCoursLe: null, champsVerifies: [], doublonDeId: null, identificationAuto: true, raisonsVerification: [] } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, apres: { statut: "A_LIRE", relecture: true } });
    reveillerLectureAmendes();
    rafraichir();
    return { ok: true, message: "Nouvelle lecture lancée." };
  });
}

function champsJournal(a: { numeroAvis: string | null; dateAvis: Date | null; infractionLe: Date | null; immatriculationLue: string | null; montantCentimes: number | null; contratId: string | null } | null) {
  if (!a) return null;
  return { numeroAvis: a.numeroAvis, dateAvis: a.dateAvis, infractionLe: a.infractionLe, immatriculation: a.immatriculationLue, montantCentimes: a.montantCentimes, contratId: a.contratId };
}

