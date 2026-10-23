"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saisieParisVersDate } from "@/lib/dates";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichierStocke, TYPES_DOCUMENTS } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaAmende, STATUTS_AMENDE_MANUELS, type SaisieAmende } from "@/lib/validations/paiement";
import { designerAmende, ErreurDesignation } from "@/server/amendes/designation";
import { evaluerAmende } from "@/server/amendes/traitement";
import { contratAuMoment } from "@/server/requetes/amendes-sinistres";

function rafraichir(id?: string, contratId?: string | null, clientId?: string | null) {
  revalidatePath("/location", "layout");
  if (id) revalidatePath(`/location/amendes/${id}`);
  if (contratId) revalidatePath(`/location/contrats/${contratId}`, "layout");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
}

/** Aperçu dans le formulaire : qui avait le véhicule à cette date ? */
export async function identifierConducteur(vehiculeId: string, dateSaisie: string) {
  return avecDroits<{ contratId: string; numero: string; client: string } | null>(ROLES_GESTION, async () => {
    const date = saisieParisVersDate(dateSaisie);
    if (!vehiculeId || !date) return { ok: true, donnees: null };
    const c = await contratAuMoment(vehiculeId, date);
    return { ok: true, donnees: c ? { contratId: c.id, numero: c.numero, client: [c.client.prenom, c.client.nom].filter(Boolean).join(" ") } : null };
  });
}

export async function enregistrerAmende(id: string | null, saisie: SaisieAmende) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaAmende.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = id ? await db.amende.findUnique({ where: { id }, include: { _count: { select: { frais: { where: { type: "AMENDE_REFACTUREE" } } } } } }) : null;
    if (id && !avant) throw new ErreurMetier("PV introuvable.");
    // Identification automatique du contrat et du client
    const c = await contratAuMoment(d.vehiculeId, d.infractionLe);
    const donnees = {
      vehiculeId: d.vehiculeId, infractionLe: d.infractionLe, lieu: d.lieu, montantCentimes: d.montant, numeroAvis: d.numeroAvis,
      dateReception: d.dateReception, dateLimite: d.dateLimite, statut: d.statut, note: d.note,
      contratId: c?.id ?? null, clientId: c?.clientId ?? null, identificationAuto: true,
    };
    // Déjà refacturé : on ne change plus le véhicule, la date ni le montant
    if (avant && avant._count.frais > 0 && (avant.vehiculeId !== d.vehiculeId || avant.infractionLe?.getTime() !== d.infractionLe.getTime() || avant.montantCentimes !== d.montant)) {
      throw new ErreurMetier("Ce PV a déjà été refacturé : retirez d'abord le frais sur le contrat pour modifier le véhicule, la date ou le montant.");
    }
    // « Conducteur désigné » choisi dans le formulaire : on passe par la désignation (date, frais de gestion).
    const designer = d.statut === "CONDUCTEUR_DESIGNE" && avant?.statut !== "CONDUCTEUR_DESIGNE";
    if (designer) donnees.statut = avant?.statut === "REFACTUREE" || !avant ? "A_DESIGNER" : (avant.statut as typeof donnees.statut);
    const a = id ? await db.amende.update({ where: { id }, data: donnees }) : await db.amende.create({ data: { ...donnees, creeParId: u.id } });
    // Alertes de l'écran « À valider » (plaque, numéro, fiche client…) calculées tout de suite.
    await evaluerAmende(db, a.id);
    if (designer) await db.$transaction((tx) => designerAmende(tx, { id: a.id, date: new Date(), utilisateurId: u.id, statutsAutorises: [...STATUTS_AMENDE_MANUELS, "RECUE", "A_LIRE"] }));
    await journaliser({ utilisateurId: u.id, action: id ? "MODIFICATION" : "CREATION", entite: "Amende", entiteId: a.id, avant, apres: a });
    rafraichir(a.id, a.contratId, a.clientId);
    return {
      ok: true,
      message: c ? `PV enregistré : véhicule loué à ce moment-là (${c.numero}, ${[c.client.prenom, c.client.nom].filter(Boolean).join(" ")}).` : "PV enregistré : aucune location à cette date (véhicule à l'agence ?).",
      donnees: { id: a.id },
    };
  });
}

export async function changerStatutAmende(id: string, statut: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    if (!(STATUTS_AMENDE_MANUELS as readonly string[]).includes(statut)) throw new ErreurMetier("Statut invalide.");
    const a = await db.amende.findUnique({ where: { id } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (statut === "CONDUCTEUR_DESIGNE") {
      // Même chemin que « Marquer comme désigné » : date du jour et frais de gestion éventuels.
      const r = await db.$transaction((tx) => designerAmende(tx, { id, date: new Date(), utilisateurId: u.id, statutsAutorises: [...STATUTS_AMENDE_MANUELS, "RECUE"] }));
      rafraichir(id, a.contratId, a.clientId);
      return { ok: true, message: r.fraisCentimes ? `Conducteur désigné : frais de gestion de ${formatEuros(r.fraisCentimes)} ajoutés.` : "Conducteur désigné." };
    }
    await db.amende.update({ where: { id }, data: { statut: statut as (typeof STATUTS_AMENDE_MANUELS)[number] } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, avant: { statut: a.statut }, apres: { statut } });
    rafraichir(id, a.contratId, a.clientId);
    return { ok: true, message: "Statut mis à jour." };
  });
}

/** « Marquer comme désigné » : date et heure de la désignation sur le site de l'ANTAI (heure de Paris). */
export async function marquerAmendeDesignee(id: string, dateSaisie: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const date = saisieParisVersDate(dateSaisie);
    if (!date) throw new ErreurMetier("Date de désignation invalide.");
    if (date.getTime() > Date.now() + 5 * 60_000) throw new ErreurMetier("La date de désignation est dans le futur.");
    try {
      const r = await db.$transaction((tx) => designerAmende(tx, { id, date, utilisateurId: u.id }));
      rafraichir(id, r.contratId, r.clientId);
      return { ok: true, message: r.fraisCentimes ? `PV marqué « désigné » : frais de gestion de ${formatEuros(r.fraisCentimes)} ajoutés${r.contratId ? " au contrat" : ""}.` : "PV marqué « désigné »." };
    } catch (e) {
      if (e instanceof ErreurDesignation) throw new ErreurMetier(e.message);
      throw e;
    }
  });
}

/** Ajoute une note datée et signée à la suite des précédentes. */
export async function ajouterNoteAmende(id: string, texte: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const propre = String(texte ?? "").trim();
    if (!propre) throw new ErreurMetier("La note est vide.");
    if (propre.length > 1000) throw new ErreurMetier("Note trop longue (1000 caractères maximum).");
    const a = await db.amende.findUnique({ where: { id }, select: { note: true, contratId: true, clientId: true } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    const ligne = `${formatDateHeure(new Date())} — ${u.nom} : ${propre}`;
    const note = (a.note ? `${a.note}\n${ligne}` : ligne).slice(-5000);
    await db.amende.update({ where: { id }, data: { note } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, apres: { note: ligne } });
    rafraichir(id, a.contratId, a.clientId);
    return { ok: true, message: "Note ajoutée." };
  });
}

/** Refacture le PV au client : frais « Amende refacturée » ajouté au contrat. */
export async function refacturerAmende(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const a = await db.amende.findUnique({ where: { id }, include: { _count: { select: { frais: { where: { type: "AMENDE_REFACTUREE" } } } } } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (!a.contratId) throw new ErreurMetier("Aucune location identifiée à la date du PV : impossible de le refacturer.");
    if (a.statut === "CONDUCTEUR_DESIGNE") throw new ErreurMetier("Le conducteur a été désigné : c'est lui qui paie l'amende, rien à refacturer.");
    if (a.statut === "IGNORE") throw new ErreurMetier("Ce PV est ignoré.");
    if (a.montantCentimes == null) throw new ErreurMetier("Montant du PV inconnu : renseignez-le avant de le refacturer.");
    const montant = a.montantCentimes;
    if (a._count.frais > 0) throw new ErreurMetier("Ce PV est déjà refacturé.");
    await db.$transaction(async (tx) => {
      await tx.fraisSupplementaire.create({
        data: {
          contratId: a.contratId!, type: "AMENDE_REFACTUREE", libelle: `Amende du ${formatDateHeure(a.infractionLe)}${a.numeroAvis ? ` (avis n° ${a.numeroAvis})` : ""}`,
          quantite: 1, prixUnitaireCentimes: montant, montantCentimes: montant, amendeId: a.id,
        },
      });
      await tx.amende.update({ where: { id }, data: { statut: "REFACTUREE" } });
      await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Amende", entiteId: id, apres: { statut: "REFACTUREE", montant: a.montantCentimes } }, tx);
    });
    rafraichir(id, a.contratId, a.clientId);
    return { ok: true, message: "PV refacturé : le montant est ajouté aux frais de la location." };
  });
}

export async function supprimerAmende(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const a = await db.amende.findUnique({ where: { id }, include: { fichiers: true, _count: { select: { frais: true } } } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    if (a._count.frais > 0) throw new ErreurMetier("Des frais sont liés à ce PV (refacturation ou frais de gestion) : retirez-les d'abord des frais du contrat.");
    await db.amende.delete({ where: { id } });
    for (const f of a.fichiers) await supprimerFichierStocke(f.cleStockage);
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "Amende", entiteId: id, avant: a });
    rafraichir(undefined, a.contratId, a.clientId);
    return { ok: true, message: "PV supprimé." };
  });
}

export async function envoyerAvisAmende(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const amendeId = String(formulaire.get("amendeId") ?? "");
    const fichier = formulaire.get("document");
    if (!(fichier instanceof File)) throw new ErreurMetier("Aucun fichier reçu.");
    const a = await db.amende.findUnique({ where: { id: amendeId } });
    if (!a) throw new ErreurMetier("PV introuvable.");
    await enregistrerFichier({ fichier, categorie: "AVIS_CONTRAVENTION", typesAutorises: TYPES_DOCUMENTS, proprietaire: { amendeId }, utilisateurId: u.id });
    rafraichir(amendeId);
    return { ok: true, message: "Avis de contravention ajouté." };
  });
}
