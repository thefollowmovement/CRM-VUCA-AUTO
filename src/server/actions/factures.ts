"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { aujourdhuiISO, dateCalendaireDepuisISO, formatDateHeure, formatNombre } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { lignesPrixContrat } from "@/lib/calculs/lignes-contrat";
import { avecDroits, ErreurMetier, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { nomVehicule } from "@/lib/vehicule";
import { erreurValidation } from "@/lib/validations/erreurs";
import { schemaAnnulationFacture } from "@/lib/validations/paiement";
import { prochainNumeroAnnuel } from "@/server/echeances";

const aujourdhui = () => dateCalendaireDepuisISO(aujourdhuiISO())!;

/** Facture de location : prix du contrat + frais supplémentaires. Destinataire figé. */
export async function emettreFactureContrat(contratId: string) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const c = await db.contratLocation.findUnique({ where: { id: contratId }, include: { client: true, options: true, fraisSupplementaires: { orderBy: { creeLe: "asc" } } } });
    if (!c) throw new ErreurMetier("Contrat introuvable.");
    if (c.statut === "ANNULEE") throw new ErreurMetier("Ce contrat est annulé.");
    if (await db.facture.findFirst({ where: { contratId, annuleeLe: null } })) throw new ErreurMetier("Une facture est déjà émise pour ce contrat : annulez-la pour en émettre une nouvelle.");
    const reglages = await lireReglages();
    const lignes = [
      ...lignesPrixContrat(c).map((l, i) => ({
        ordre: i,
        libelle: i === 0 ? `${l.libelle} du ${formatDateHeure(c.departReelLe ?? c.departPrevuLe)} au ${formatDateHeure(c.retourReelLe ?? c.retourPrevuLe)}` : l.libelle,
        quantite: 1,
        prixUnitaireCentimes: l.montant,
        totalCentimes: l.montant,
      })),
      ...c.fraisSupplementaires.map((f, i) => ({ ordre: 100 + i, libelle: f.libelle, quantite: f.quantite, prixUnitaireCentimes: f.prixUnitaireCentimes, totalCentimes: f.montantCentimes })),
    ];
    const total = lignes.reduce((a, l) => a + l.totalCentimes, 0);
    const destinataire = c.client.entreprise ? `${c.client.entreprise} (${[c.client.prenom, c.client.nom].filter(Boolean).join(" ")})` : [c.client.prenom, c.client.nom].filter(Boolean).join(" ");
    const f = await db.$transaction(async (tx) => {
      const numero = await prochainNumeroAnnuel(tx, "facture", reglages.prefixeFacture);
      const cree = await tx.facture.create({
        data: {
          numero, type: "LOCATION", dateEmission: aujourdhui(), contratId, clientId: c.clientId, destinataireNom: destinataire,
          destinataireAdresse: [c.client.adresse, [c.client.codePostal, c.client.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
          totalCentimes: total, mention: reglages.mentionFacture, lignes: { create: lignes },
        },
      });
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Facture", entiteId: cree.id, apres: { numero, total, lignes } }, tx);
      return cree;
    });
    revalidatePath(`/location/contrats/${contratId}`, "layout");
    return { ok: true, message: `Facture ${f.numero} émise.`, donnees: { id: f.id } };
  });
}

/** Facture de vente d'un véhicule vendu (décision Phase 0 n° 10). */
export async function emettreFactureVente(vehiculeId: string) {
  return avecDroits<{ id: string }>(ROLES_GESTION, async (u) => {
    const v = await db.vehicule.findUnique({ where: { id: vehiculeId } });
    if (!v) throw new ErreurMetier("Véhicule introuvable.");
    if (v.statut !== "VENDU" || v.prixVenteCentimes === null) throw new ErreurMetier("Le véhicule n'est pas vendu.");
    if (!v.acheteurNom) throw new ErreurMetier("Indiquez le nom de l'acheteur (annulez puis refaites la vente pour le saisir).");
    if (await db.facture.findFirst({ where: { vehiculeId, type: "VENTE_VEHICULE", annuleeLe: null } })) throw new ErreurMetier("Une facture de vente existe déjà : annulez-la pour en émettre une nouvelle.");
    const reglages = await lireReglages();
    const libelle = [
      `Vente du véhicule ${nomVehicule(v)}`,
      v.immatriculation && `immatriculé ${v.immatriculation}`,
      v.vin && `VIN ${v.vin}`,
      v.kilometrageVente !== null && `${formatNombre(v.kilometrageVente)} km`,
    ]
      .filter(Boolean)
      .join(", ");
    const f = await db.$transaction(async (tx) => {
      const numero = await prochainNumeroAnnuel(tx, "facture", reglages.prefixeFacture);
      const cree = await tx.facture.create({
        data: {
          numero, type: "VENTE_VEHICULE", dateEmission: v.dateVente ?? aujourdhui(), vehiculeId, destinataireNom: v.acheteurNom!, destinataireAdresse: v.acheteurAdresse,
          totalCentimes: v.prixVenteCentimes!, mention: reglages.mentionFacture,
          lignes: { create: [{ ordre: 0, libelle, quantite: 1, prixUnitaireCentimes: v.prixVenteCentimes!, totalCentimes: v.prixVenteCentimes! }] },
        },
      });
      await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Facture", entiteId: cree.id, apres: { numero, total: v.prixVenteCentimes } }, tx);
      return cree;
    });
    revalidatePath(`/vehicules/${vehiculeId}`, "layout");
    return { ok: true, message: `Facture ${f.numero} émise.`, donnees: { id: f.id } };
  });
}

/** Une facture émise n'est jamais modifiée : on l'annule (motif) puis on en émet une nouvelle. */
export async function annulerFacture(id: string, saisie: { motif: string }) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaAnnulationFacture.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const f = await db.facture.findUnique({ where: { id } });
    if (!f) throw new ErreurMetier("Facture introuvable.");
    if (f.annuleeLe) throw new ErreurMetier("Cette facture est déjà annulée.");
    await db.facture.update({ where: { id }, data: { annuleeLe: new Date(), motifAnnulation: lecture.data.motif } });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Facture", entiteId: id, apres: { annulee: true, motif: lecture.data.motif } });
    if (f.contratId) revalidatePath(`/location/contrats/${f.contratId}`, "layout");
    if (f.vehiculeId) revalidatePath(`/vehicules/${f.vehiculeId}`, "layout");
    return { ok: true, message: `Facture ${f.numero} annulée.` };
  });
}
