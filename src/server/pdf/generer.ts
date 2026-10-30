// Chargement des données et rendu des PDF (à la demande, à partir des copies figées).
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import sharp from "sharp";
import { joursFactures, kmInclusTotal } from "@/lib/calculs/location";
import { db } from "@/lib/db";
import { formatDate, formatEuros, formatNombre } from "@/lib/format";
import { lireReglages } from "@/lib/reglages";
import { LIBELLES_GRAVITE, libelleDommage, type Gravite, type TypeDommage, type Vue } from "@/lib/schema-vehicule";
import { lireMiniature, stockage } from "@/lib/storage";
import { LIBELLES_CARBURANT, nomVehicule } from "@/lib/vehicule";
import { LIBELLES_PROPRETE, LIBELLES_STATUT_CAUTION, PHOTOS_GUIDEES } from "@/lib/validations/etat-des-lieux";
import { LIBELLES_MODE_PAIEMENT } from "@/lib/validations/finance";
import { LIBELLES_MODE_CAUTION, LIBELLES_PIECE, LIBELLES_TYPE_LOCATION } from "@/lib/validations/location";
import { LIBELLES_NATURE_PAIEMENT } from "@/lib/validations/paiement";
import { lignesPrixContrat } from "@/lib/calculs/lignes-contrat";
import { totalEncaisse } from "@/server/echeances";
import { donneesRapport, donneesReleve } from "@/server/requetes/rapports";
import { PdfRapport, PdfReleve } from "./analyses";
import { PdfCloture, PdfContrat, PdfEtatDesLieux, PdfFacture, PdfRecu, type ImagePdf } from "./documents";

export type TypeDocumentPdf = "contrat" | "edl-depart" | "edl-retour" | "recu" | "facture" | "cloture";

const nomPersonne = (c: { nom: string; prenom: string | null }) => [c.prenom, c.nom].filter(Boolean).join(" ");
const adresse = (c: { adresse: string | null; codePostal: string | null; ville: string | null }) =>
  [c.adresse, [c.codePostal, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;

async function base() {
  const reglages = await lireReglages();
  let logo: ImagePdf | null = null;
  if (reglages.logoId) {
    const f = await db.fichier.findUnique({ where: { id: reglages.logoId } });
    if (f) {
      try {
        // PNG pour tous les formats (le PDF n'accepte que JPEG et PNG)
        logo = { data: await sharp(await stockage.lire(f.cleStockage)).png().toBuffer(), format: "png" };
      } catch {
        logo = null;
      }
    }
  }
  return { reglages, base: { societe: reglages, logo } };
}

async function image(cle: string | null | undefined, format: "png" | "jpg" = "png"): Promise<ImagePdf | null> {
  if (!cle) return null;
  try {
    return { data: await stockage.lire(cle), format };
  } catch {
    return null;
  }
}

async function rendre(element: ReactElement, nom: string) {
  return { contenu: await renderToBuffer(element as never), nom };
}

export async function genererPdf(type: TypeDocumentPdf, id: string): Promise<{ contenu: Buffer; nom: string } | null> {
  switch (type) {
    case "recu":
      return recu(id);
    case "facture":
      return facture(id);
    case "contrat":
      return contrat(id);
    case "edl-depart":
      return etatDesLieux(id, "DEPART");
    case "edl-retour":
      return etatDesLieux(id, "RETOUR");
    case "cloture":
      return cloture(id);
  }
}

// ---------------------------------------------------------------------

async function recu(paiementId: string) {
  const p = await db.paiement.findUnique({
    where: { id: paiementId },
    include: { echeance: { select: { libelle: true } }, contrat: { include: { client: true, vehicule: { select: { marque: true, modele: true, version: true, immatriculation: true } } } } },
  });
  if (!p?.numeroRecu) return null;
  const { reglages, base: b } = await base();
  return rendre(
    createElement(PdfRecu, {
      ...b,
      numero: p.numeroRecu,
      date: p.date,
      montantCentimes: p.montantCentimes,
      mode: LIBELLES_MODE_PAIEMENT[p.mode],
      nature: LIBELLES_NATURE_PAIEMENT[p.nature] ?? p.nature,
      reference: p.reference,
      client: nomPersonne(p.contrat.client),
      contrat: p.contrat.numero,
      vehicule: `${nomVehicule(p.contrat.vehicule)}${p.contrat.vehicule.immatriculation ? ` · ${p.contrat.vehicule.immatriculation}` : ""}`,
      echeance: p.echeance?.libelle ?? null,
      mention: reglages.mentionFacture,
    }),
    `recu-${p.numeroRecu}.pdf`,
  );
}

async function facture(factureId: string) {
  const f = await db.facture.findUnique({
    where: { id: factureId },
    include: {
      lignes: { orderBy: { ordre: "asc" } },
      contrat: { select: { numero: true, paiements: { select: { montantCentimes: true, nature: true } } } },
      vehicule: { select: { marque: true, modele: true, version: true, immatriculation: true } },
    },
  });
  if (!f) return null;
  const { base: b } = await base();
  const objet = f.contrat ? `Location de véhicule · contrat ${f.contrat.numero}` : f.vehicule ? `Vente du véhicule ${nomVehicule(f.vehicule)}` : "Facture";
  return rendre(
    createElement(PdfFacture, {
      ...b,
      numero: f.numero,
      dateEmission: f.dateEmission,
      destinataireNom: f.destinataireNom,
      destinataireAdresse: f.destinataireAdresse,
      objet,
      lignes: f.lignes,
      totalCentimes: f.totalCentimes,
      dejaPayeCentimes: f.contrat ? totalEncaisse(f.contrat.paiements) : null,
      mention: f.mention,
      annulee: f.annuleeLe ? { le: f.annuleeLe, motif: f.motifAnnulation } : null,
    }),
    `facture-${f.numero}.pdf`,
  );
}

async function contrat(contratId: string) {
  const c = await db.contratLocation.findUnique({
    where: { id: contratId },
    include: {
      client: true,
      vehicule: true,
      options: true,
      conducteursAdditionnels: { include: { client: { select: { nom: true, prenom: true, numeroPermis: true } } } },
      echeances: { orderBy: { numero: "asc" } },
      etatsDesLieux: { where: { type: "DEPART", verrouille: true }, include: { signatureClient: true, signatureLoueur: true } },
    },
  });
  if (!c) return null;
  const { reglages, base: b } = await base();
  const edl = c.etatsDesLieux[0];
  const joursTotal = joursFactures(c.departPrevuLe, c.retourPrevuLe, reglages.toleranceRetardMinutes);
  const km = c.kilometrageIllimite ? null : kmInclusTotal(c.type, c.kmInclusParUnite, { unites: c.dureeFacturee, joursSupplementaires: c.joursSupplementaires, joursTotal });
  return rendre(
    createElement(PdfContrat, {
      ...b,
      numero: c.numero,
      type: LIBELLES_TYPE_LOCATION[c.type],
      creeLe: c.creeLe,
      client: {
        nom: nomPersonne(c.client),
        adresse: adresse(c.client),
        telephone: c.client.telephone,
        email: c.client.email,
        naissance: c.client.dateNaissance ? `${formatDate(c.client.dateNaissance)}${c.client.lieuNaissance ? ` à ${c.client.lieuNaissance}` : ""}` : null,
        permis: c.client.numeroPermis ? `${c.client.numeroPermis}${c.client.dateObtentionPermis ? ` obtenu le ${formatDate(c.client.dateObtentionPermis)}` : ""}` : null,
        piece: c.client.typePieceIdentite ? `${LIBELLES_PIECE[c.client.typePieceIdentite]}${c.client.numeroPieceIdentite ? ` n° ${c.client.numeroPieceIdentite}` : ""}` : null,
        entreprise: c.client.entreprise,
      },
      conducteurs: c.conducteursAdditionnels.map((x) => `${nomPersonne(x.client)}${x.client.numeroPermis ? ` (permis ${x.client.numeroPermis})` : ""}`),
      vehicule: {
        nom: nomVehicule(c.vehicule),
        immatriculation: c.vehicule.immatriculation,
        vin: c.vehicule.vin,
        km: edl?.kilometrage ?? c.vehicule.kilometrageActuel,
        carburant: c.vehicule.carburant ? LIBELLES_CARBURANT[c.vehicule.carburant] : null,
      },
      depart: c.departPrevuLe,
      retour: c.retourPrevuLe,
      lieuDepart: c.lieuDepart,
      lieuRetour: c.lieuRetour,
      lignesPrix: lignesPrixContrat(c),
      prixTotalCentimes: c.prixTotalCentimes,
      kilometrage: c.kilometrageIllimite ? "Illimité" : km !== null ? `${formatNombre(km)} km inclus` : "Non précisé",
      prixKmSup: c.kilometrageIllimite ? null : c.prixKmSupCentimes,
      caution: `${formatEuros(c.cautionCentimes)}${c.modeCaution ? ` (${LIBELLES_MODE_CAUTION[c.modeCaution]})` : ""}`,
      franchise: c.franchiseCentimes,
      echeancier: c.echeances.filter((e) => e.statut !== "ANNULEE").map((e) => ({ libelle: e.libelle, date: e.dateEcheance, montant: e.montantCentimes })),
      conditions: c.conditionsGenerales,
      mentions: reglages.mentionsContrat,
      signatures: {
        client: await image(edl?.signatureClient?.cleStockage),
        loueur: await image(edl?.signatureLoueur?.cleStockage),
        nom: edl?.nomSignataireClient ?? null,
        le: edl?.signeLe ?? null,
      },
    }),
    `contrat-${c.numero}.pdf`,
  );
}

const LIBELLE_PHOTO: Record<string, string> = { EDL_COMPTEUR: "Compteur", EDL_LIBRE: "Photo libre", ...Object.fromEntries(PHOTOS_GUIDEES.map((p) => [p.categorie, p.libelle])) };

async function etatDesLieux(contratId: string, type: "DEPART" | "RETOUR") {
  const edl = await db.etatDesLieux.findUnique({
    where: { contratId_type: { contratId, type } },
    include: {
      checklist: { orderBy: { libelle: "asc" } },
      photos: { orderBy: { creeLe: "asc" } },
      signatureClient: true,
      signatureLoueur: true,
      realisePar: { select: { nom: true } },
      contrat: { include: { client: { select: { nom: true, prenom: true } }, vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } } } },
    },
  });
  if (!edl?.verrouille) return null;
  const { reglages, base: b } = await base();
  const date = edl.signeLe ?? edl.realiseLe;
  const dommages = await db.dommage.findMany({ where: { vehiculeId: edl.contrat.vehicule.id }, orderBy: { constateLe: "asc" } });
  const presents = dommages
    .map((d, i) => ({ d, numero: i + 1 }))
    .filter(({ d }) => d.constateLe <= date && (!d.repareLe || d.repareLe > date));
  const photos = [];
  for (const p of edl.photos.filter((x) => x.categorie !== "SIGNATURE")) {
    try {
      photos.push({ libelle: LIBELLE_PHOTO[p.categorie] ?? "", image: { data: await lireMiniature(p.cleStockage), format: "jpg" as const } });
    } catch {
      // photo absente du stockage : ignorée
    }
  }
  const releves: [string, string][] = [["Kilométrage", `${formatNombre(edl.kilometrage)} km`]];
  if (edl.niveauCarburantHuitiemes !== null) releves.push(["Carburant", `${edl.niveauCarburantHuitiemes}/8`]);
  if (edl.niveauBatteriePct !== null) releves.push(["Batterie", `${edl.niveauBatteriePct} %`]);
  if (edl.propreteInterieure) releves.push(["Propreté intérieure", LIBELLES_PROPRETE[edl.propreteInterieure]]);
  if (edl.propreteExterieure) releves.push(["Propreté extérieure", LIBELLES_PROPRETE[edl.propreteExterieure]]);
  return rendre(
    createElement(PdfEtatDesLieux, {
      ...b,
      type,
      numeroContrat: edl.contrat.numero,
      client: nomPersonne(edl.contrat.client),
      vehicule: `${nomVehicule(edl.contrat.vehicule)}${edl.contrat.vehicule.immatriculation ? ` · ${edl.contrat.vehicule.immatriculation}` : ""}`,
      signeLe: edl.signeLe,
      realisePar: edl.realisePar?.nom ?? null,
      releves,
      checklist: edl.checklist,
      dommages: presents.map(({ d, numero }) => ({
        numero,
        libelle: libelleDommage({ type: d.type as TypeDommage, vue: d.vue as Vue, zone: d.zone }),
        gravite: LIBELLES_GRAVITE[d.gravite as Gravite],
        nouveau: d.etatDesLieuxConstatationId === edl.id,
      })),
      photos,
      remarques: edl.remarques,
      mentions: reglages.mentionsEtatDesLieux,
      signatures: { client: await image(edl.signatureClient?.cleStockage), loueur: await image(edl.signatureLoueur?.cleStockage), nom: edl.nomSignataireClient },
    }),
    `etat-des-lieux-${type === "DEPART" ? "depart" : "retour"}-${edl.contrat.numero}.pdf`,
  );
}

async function cloture(contratId: string) {
  const c = await db.contratLocation.findUnique({
    where: { id: contratId },
    include: {
      client: { select: { nom: true, prenom: true } },
      vehicule: { select: { marque: true, modele: true, version: true, immatriculation: true } },
      fraisSupplementaires: { orderBy: { creeLe: "asc" } },
      paiements: { orderBy: [{ date: "asc" }, { creeLe: "asc" }] },
      etatsDesLieux: { select: { type: true, kilometrage: true } },
    },
  });
  if (!c) return null;
  const { base: b } = await base();
  const totalFrais = c.fraisSupplementaires.reduce((a, f) => a + f.montantCentimes, 0);
  return rendre(
    createElement(PdfCloture, {
      ...b,
      numero: c.numero,
      client: nomPersonne(c.client),
      vehicule: `${nomVehicule(c.vehicule)}${c.vehicule.immatriculation ? ` · ${c.vehicule.immatriculation}` : ""}`,
      departReel: c.departReelLe,
      retourReel: c.retourReelLe,
      kmDepart: c.etatsDesLieux.find((e) => e.type === "DEPART")?.kilometrage ?? null,
      kmRetour: c.etatsDesLieux.find((e) => e.type === "RETOUR")?.kilometrage ?? null,
      prixLocationCentimes: c.prixTotalCentimes,
      frais: c.fraisSupplementaires.map((f) => ({ libelle: f.libelle, montant: f.montantCentimes })),
      paiements: c.paiements.map((p) => ({
        date: p.date,
        libelle: `${LIBELLES_NATURE_PAIEMENT[p.nature] ?? p.nature} · ${LIBELLES_MODE_PAIEMENT[p.mode]}${p.numeroRecu ? ` · reçu ${p.numeroRecu}` : ""}`,
        montant: p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes,
      })),
      caution: { montant: c.cautionCentimes, statut: LIBELLES_STATUT_CAUTION[c.statutCaution], retenue: c.cautionRetenueCentimes, motif: c.motifRetenueCaution },
      totalDuCentimes: c.prixTotalCentimes + totalFrais,
      encaisseCentimes: totalEncaisse(c.paiements),
    }),
    `releve-cloture-${c.numero}.pdf`,
  );
}

// ---------------------------------------------------------------------
//  Relevé investisseur et bilan de période (Phase 7)
// ---------------------------------------------------------------------

export async function genererReleve(partenaireId: string, du: string, au: string) {
  const releve = await donneesReleve(partenaireId, du, au);
  if (!releve) return null;
  const { base: b } = await base();
  const nom = releve.partenaire.nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return rendre(createElement(PdfReleve, { ...b, releve, editeLe: new Date() }), `releve-${nom}-${du}-${au}.pdf`);
}

export async function genererRapport(du: string, au: string, partenaireId?: string) {
  const rapport = await donneesRapport(du, au, partenaireId);
  const { base: b } = await base();
  return rendre(createElement(PdfRapport, { ...b, rapport, editeLe: new Date() }), `bilan-${du}-${au}.pdf`);
}
