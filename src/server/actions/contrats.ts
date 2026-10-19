"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { alertesClient } from "@/lib/calculs/clients";
import { calculerPrixLocation } from "@/lib/calculs/location";
import { STATUTS_VEHICULE_NON_LOUABLES } from "@/lib/contrat";
import { db } from "@/lib/db";
import { partiesParis, saisieParisVersDate } from "@/lib/dates";
import { formatDateHeure } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaFrais } from "@/lib/validations/etat-des-lieux";
import { schemaAnnulation, schemaContrat, type DonneesContrat, type SaisieContrat } from "@/lib/validations/location";
import { conflits } from "@/server/requetes/contrats";

function rafraichir(contratId?: string, vehiculeId?: string, clientIds: string[] = []) {
  revalidatePath("/location", "layout");
  if (contratId) revalidatePath(`/location/contrats/${contratId}`);
  if (vehiculeId) revalidatePath(`/vehicules/${vehiculeId}`, "layout");
  for (const id of clientIds) revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
}

const nom = (c: { nom: string; prenom: string | null }) => [c.prenom, c.nom].filter(Boolean).join(" ");

/** La contrainte PostgreSQL d'anti-chevauchement a refusé l'écriture (deux saisies simultanées). */
function estChevauchement(erreur: unknown): boolean {
  const texte = `${erreur instanceof Error ? erreur.message : ""} ${JSON.stringify(erreur) ?? ""}`;
  return texte.includes("Contrat_sans_chevauchement") || texte.includes("23P01");
}

/** Messages des conflits de dates. */
async function verifierDisponibilite(vehiculeId: string, depart: Date, retour: Date, sauf?: string) {
  const c = await conflits(depart, retour, sauf, vehiculeId);
  if (c.length > 0) {
    const x = c[0]!;
    throw new ErreurMetier(
      `Véhicule déjà réservé du ${formatDateHeure(x.departPrevuLe)} au ${formatDateHeure(x.retourPrevuLe)} (${x.numero}, ${nom(x.client)}).`,
    );
  }
}

/**
 * Contrôles métier + calcul du prix (toujours refait côté serveur).
 * Renvoie les données prêtes à écrire, options figées.
 */
async function preparer(d: DonneesContrat, sauf?: string) {
  const [vehicule, client, conducteurs, catalogue, reglages] = await Promise.all([
    db.vehicule.findUnique({ where: { id: d.vehiculeId }, select: { id: true, statut: true, typeExploitation: true } }),
    db.client.findUnique({ where: { id: d.clientId } }),
    db.client.findMany({ where: { id: { in: d.conducteursIds } } }),
    db.optionLocation.findMany({ where: { id: { in: d.options.map((o) => o.optionId) } } }),
    lireReglages(),
  ]);
  if (!vehicule) throw new ErreurMetier("Véhicule introuvable.");
  if (vehicule.typeExploitation === "ACHAT_REVENTE") throw new ErreurMetier("Ce véhicule n'est pas proposé à la location (achat-revente).");
  if ((STATUTS_VEHICULE_NON_LOUABLES as readonly string[]).includes(vehicule.statut)) {
    throw new ErreurMetier(vehicule.statut === "IMMOBILISE" ? "Ce véhicule est immobilisé : impossible de le louer." : "Ce véhicule ne peut plus être loué (vendu ou archivé).");
  }
  if (!client || client.anonymiseLe || client.archiveLe) throw new ErreurMetier("Client introuvable ou archivé.");
  const auj = new Date();
  for (const c of [client, ...conducteurs]) {
    const bloquant = alertesClient(c, auj, reglages.anciennetePermisMinAnnees).find((a) => a.niveau === "bloquant");
    if (bloquant) throw new ErreurMetier(`${nom(c)} : ${bloquant.texte.toLowerCase()}.`);
  }
  if (conducteurs.length !== d.conducteursIds.length) throw new ErreurMetier("Un des conducteurs additionnels est introuvable.");
  if (catalogue.length !== d.options.length) throw new ErreurMetier("Une des options n'existe plus.");

  await verifierDisponibilite(d.vehiculeId, d.departPrevuLe, d.retourPrevuLe, sauf);

  // Options figées (libellé et prix copiés)
  const options = d.options.map((o) => {
    const opt = catalogue.find((c) => c.id === o.optionId)!;
    return { opt, quantite: o.quantite };
  });
  const prix = calculerPrixLocation({
    type: d.type,
    depart: d.departPrevuLe,
    retour: d.retourPrevuLe,
    toleranceMinutes: reglages.toleranceRetardMinutes,
    tarifCentimes: d.tarif,
    tarifJournalierCentimes: d.type === "HEBDOMADAIRE" ? d.tarifJournalier : null,
    remiseCentimes: d.remise ?? 0,
    fraisLivraisonCentimes: d.livraison ? (d.fraisLivraison ?? 0) : 0,
    options: options.map(({ opt, quantite }) => ({ modeTarif: opt.modeTarif, prixCentimes: opt.prixCentimes, plafondCentimes: opt.plafondCentimes, quantite })),
  });
  if (prix.prixTotalCentimes < 0) throw new ErreurMetier("La remise dépasse le prix de la location.");

  const donnees = {
    vehiculeId: d.vehiculeId,
    clientId: d.clientId,
    type: d.type,
    departPrevuLe: d.departPrevuLe,
    retourPrevuLe: d.retourPrevuLe,
    lieuDepart: d.lieuDepart,
    lieuRetour: d.lieuRetour,
    livraison: d.livraison,
    tarifCentimes: d.tarif,
    tarifJournalierCentimes: d.type === "HEBDOMADAIRE" ? d.tarifJournalier : null,
    dureeFacturee: prix.unites,
    joursSupplementaires: prix.joursSupplementaires,
    remiseCentimes: prix.remiseCentimes,
    fraisLivraisonCentimes: prix.fraisLivraisonCentimes,
    prixTotalCentimes: prix.prixTotalCentimes,
    acompteCentimes: d.type === "MENSUELLE" ? null : d.acompte,
    jourEcheanceMensuelle: d.type === "MENSUELLE" ? (d.jourEcheanceMensuelle ?? reglages.jourEcheanceMensuelleDefaut) : null,
    kilometrageIllimite: d.kilometrageIllimite,
    kmInclusParUnite: d.kilometrageIllimite ? null : d.kmInclusParUnite,
    prixKmSupCentimes: d.kilometrageIllimite ? null : d.prixKmSup,
    cautionCentimes: d.caution ?? 0,
    modeCaution: d.modeCaution,
    franchiseCentimes: d.franchise,
    notes: d.notes,
  } satisfies Partial<Prisma.ContratLocationUncheckedCreateInput>;

  const lignesOptions = options.map(({ opt, quantite }, i) => ({
    optionId: opt.id,
    libelle: opt.libelle,
    modeTarif: opt.modeTarif,
    prixCentimes: opt.prixCentimes,
    quantite,
    totalCentimes: prix.totalOptions[i] ?? 0,
  }));
  return { donnees, lignesOptions, reglages };
}

/** Prochain numéro « LOC-2026-0001 » (compteur annuel, dans la transaction). */
async function prochainNumero(tx: Prisma.TransactionClient, prefixe: string, date: Date) {
  const annee = partiesParis(date).annee;
  const cle = `contrat:${annee}`;
  const compteur = await tx.compteur.upsert({ where: { cle }, create: { cle, valeur: 1 }, update: { valeur: { increment: 1 } } });
  return `${prefixe}-${annee}-${String(compteur.valeur).padStart(4, "0")}`;
}

export async function creerContrat(saisie: SaisieContrat) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const lecture = schemaContrat.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const { donnees, lignesOptions, reglages } = await preparer(d);
    try {
      const contrat = await db.$transaction(async (tx) => {
        const numero = await prochainNumero(tx, reglages.prefixeContrat, new Date());
        const cree = await tx.contratLocation.create({
          data: {
            ...donnees,
            numero,
            statut: d.statut,
            conditionsGenerales: reglages.conditionsGenerales, // copie figée
            options: { create: lignesOptions },
            conducteursAdditionnels: { create: d.conducteursIds.map((clientId) => ({ clientId })) },
          },
        });
        await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "ContratLocation", entiteId: cree.id, apres: { ...cree, options: lignesOptions } }, tx);
        return cree;
      });
      rafraichir(contrat.id, d.vehiculeId, [d.clientId, ...d.conducteursIds]);
      return { ok: true, message: `Contrat ${contrat.numero} créé.`, donnees: { id: contrat.id } };
    } catch (e) {
      if (estChevauchement(e)) throw new ErreurMetier("Ce véhicule vient d'être réservé sur ces dates. Choisissez d'autres dates ou un autre véhicule.");
      throw e;
    }
  });
}

export async function modifierContrat(id: string, saisie: SaisieContrat) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaContrat.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = await db.contratLocation.findUnique({ where: { id }, include: { options: true, conducteursAdditionnels: true } });
    if (!avant) throw new ErreurMetier("Contrat introuvable.");
    if (!["RESERVATION", "CONFIRMEE"].includes(avant.statut)) throw new ErreurMetier("Seule une réservation (pas encore partie) peut être modifiée.");
    const { donnees, lignesOptions } = await preparer(d, id);
    try {
      await db.$transaction(async (tx) => {
        await tx.optionContrat.deleteMany({ where: { contratId: id } });
        await tx.conducteurAdditionnel.deleteMany({ where: { contratId: id } });
        const apres = await tx.contratLocation.update({
          where: { id },
          data: {
            ...donnees,
            statut: d.statut,
            options: { create: lignesOptions },
            conducteursAdditionnels: { create: d.conducteursIds.map((clientId) => ({ clientId })) },
          },
        });
        await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ContratLocation", entiteId: id, avant, apres: { ...apres, options: lignesOptions } }, tx);
      });
    } catch (e) {
      if (estChevauchement(e)) throw new ErreurMetier("Ce véhicule vient d'être réservé sur ces dates.");
      throw e;
    }
    rafraichir(id, d.vehiculeId, [d.clientId, avant.clientId, ...d.conducteursIds]);
    if (avant.vehiculeId !== d.vehiculeId) rafraichir(undefined, avant.vehiculeId);
    return { ok: true, message: "Contrat modifié." };
  });
}

async function contratExistant(id: string) {
  const c = await db.contratLocation.findUnique({ where: { id } });
  if (!c) throw new ErreurMetier("Contrat introuvable.");
  return c;
}

export async function confirmerContrat(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const c = await contratExistant(id);
    if (c.statut !== "RESERVATION") throw new ErreurMetier("Seule une réservation peut être confirmée.");
    await db.contratLocation.update({ where: { id }, data: { statut: "CONFIRMEE" } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ContratLocation", entiteId: id, avant: { statut: c.statut }, apres: { statut: "CONFIRMEE" } });
    rafraichir(id, c.vehiculeId, [c.clientId]);
    return { ok: true, message: "Réservation confirmée." };
  });
}

export async function annulerContrat(id: string, saisie: { motif: string }) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaAnnulation.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const c = await contratExistant(id);
    if (!["RESERVATION", "CONFIRMEE"].includes(c.statut)) throw new ErreurMetier("Une location en cours ou terminée ne peut pas être annulée.");
    await db.contratLocation.update({ where: { id }, data: { statut: "ANNULEE", annuleLe: new Date(), motifAnnulation: lecture.data.motif } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ContratLocation", entiteId: id, avant: { statut: c.statut }, apres: { statut: "ANNULEE", motif: lecture.data.motif } });
    rafraichir(id, c.vehiculeId, [c.clientId]);
    return { ok: true, message: "Contrat annulé : le véhicule est de nouveau disponible sur ces dates." };
  });
}

export async function archiverContrat(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const c = await contratExistant(id);
    if (!["TERMINEE", "ANNULEE"].includes(c.statut)) throw new ErreurMetier("Seul un contrat terminé ou annulé peut être archivé.");
    await db.contratLocation.update({ where: { id }, data: { archiveLe: new Date() } });
    await journaliser({ utilisateurId: u.id, action: "ARCHIVAGE", entite: "ContratLocation", entiteId: id });
    rafraichir(id, c.vehiculeId, [c.clientId]);
    return { ok: true, message: "Contrat archivé." };
  });
}

export async function restaurerContrat(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const c = await contratExistant(id);
    await db.contratLocation.update({ where: { id }, data: { archiveLe: null } });
    await journaliser({ utilisateurId: u.id, action: "RESTAURATION", entite: "ContratLocation", entiteId: id });
    rafraichir(id, c.vehiculeId, [c.clientId]);
    return { ok: true, message: "Contrat restauré." };
  });
}

/** Suppression : admin, uniquement une réservation / un contrat annulé sans paiement ni état des lieux (erreur de saisie). */
export async function supprimerContrat(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const c = await db.contratLocation.findUnique({
      where: { id },
      include: { _count: { select: { paiements: true, etatsDesLieux: true, echeances: true, factures: true, amendes: true, sinistres: true } } },
    });
    if (!c) throw new ErreurMetier("Contrat introuvable.");
    if (!["RESERVATION", "CONFIRMEE", "ANNULEE"].includes(c.statut) || Object.values(c._count).some((n) => n > 0)) {
      throw new ErreurMetier("Ce contrat a un historique (départ, paiements…) : annulez-le ou archivez-le plutôt.");
    }
    await db.$transaction(async (tx) => {
      await tx.contratLocation.delete({ where: { id } });
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "ContratLocation", entiteId: id, avant: c }, tx);
    });
    rafraichir(undefined, c.vehiculeId, [c.clientId]);
    return { ok: true, message: `Contrat ${c.numero} supprimé.` };
  });
}

/** Assistant : disponibilité de chaque véhicule louable sur la période saisie. */
export async function disponibilites(departSaisie: string, retourSaisie: string, sauf?: string) {
  return avecDroits<{ vehiculeId: string; conflit: string }[]>(ROLES_GESTION, async () => {
    const depart = saisieParisVersDate(departSaisie);
    const retour = saisieParisVersDate(retourSaisie);
    if (!depart || !retour || retour <= depart) return { ok: true, donnees: [] };
    const c = await conflits(depart, retour, sauf);
    return {
      ok: true,
      donnees: c.map((x) => ({ vehiculeId: x.vehiculeId, conflit: `${x.numero} · ${nom(x.client)} · du ${formatDateHeure(x.departPrevuLe)} au ${formatDateHeure(x.retourPrevuLe)}` })),
    };
  });
}

// ---------------------------------------------------------------------
//  Frais supplémentaires (ajout / retrait manuel, ex. amende refacturée)
// ---------------------------------------------------------------------

export async function ajouterFrais(contratId: string, saisie: { type: string; libelle: string; quantite: string; prixUnitaire: string }) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaFrais.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const c = await contratExistant(contratId);
    if (c.statut === "ANNULEE") throw new ErreurMetier("Ce contrat est annulé.");
    const f = await db.fraisSupplementaire.create({
      data: { contratId, type: d.type, libelle: d.libelle, quantite: d.quantite, prixUnitaireCentimes: d.prixUnitaire, montantCentimes: d.quantite * d.prixUnitaire },
    });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "FraisSupplementaire", entiteId: f.id, apres: f });
    rafraichir(contratId, c.vehiculeId);
    return { ok: true, message: "Frais ajouté." };
  });
}

export async function supprimerFrais(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const f = await db.fraisSupplementaire.findUnique({ where: { id }, include: { contrat: { select: { vehiculeId: true, _count: { select: { factures: true } } } } } });
    if (!f) throw new ErreurMetier("Frais introuvable.");
    if (f.contrat._count.factures > 0) throw new ErreurMetier("Ce contrat a déjà été facturé : annulez la facture d'abord.");
    await db.fraisSupplementaire.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "FraisSupplementaire", entiteId: id, avant: f });
    rafraichir(f.contratId, f.contrat.vehiculeId);
    return { ok: true, message: "Frais retiré." };
  });
}
