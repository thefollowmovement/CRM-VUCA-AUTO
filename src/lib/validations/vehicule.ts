// Validation des véhicules — partagée entre le formulaire (navigateur) et les Server Actions.
import { z } from "zod";
import { partenairesEnDouble, resumerFinancement } from "@/lib/calculs/financement";
import { formatEuros } from "@/lib/format";
import { normaliserImmatriculation, normaliserVin } from "@/lib/vehicule";
import {
  choixOptionnel,
  dateCalendaire,
  dateOptionnelle,
  entierOptionnel,
  montant,
  montantOptionnel,
  texte,
  texteOptionnel,
  urlOptionnelle,
} from "./communs";

const anneeMax = new Date().getFullYear() + 1;

export const CARBURANTS = ["ESSENCE", "DIESEL", "HYBRIDE", "HYBRIDE_RECHARGEABLE", "ELECTRIQUE", "GPL", "E85", "AUTRE"] as const;
export const BOITES = ["MANUELLE", "AUTOMATIQUE"] as const;
export const CRITAIRS = ["CRIT_AIR_0", "CRIT_AIR_1", "CRIT_AIR_2", "CRIT_AIR_3", "CRIT_AIR_4", "CRIT_AIR_5", "NON_CLASSE"] as const;
export const PROVENANCES = ["PARTICULIER", "PROFESSIONNEL", "ENCHERES", "IMPORT", "REPRISE", "AUTRE"] as const;
export const TYPES_EXPLOITATION = ["ACHAT_REVENTE", "LOCATION", "MIXTE"] as const;
export const STATUTS_INITIAUX = ["EN_PREPARATION", "EN_VENTE", "RESERVE", "DISPONIBLE_LOCATION", "IMMOBILISE"] as const;

const immatriculation = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = normaliserImmatriculation(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Immatriculation invalide (format AA-123-AA ou ancien format 1234 AB 56)." });
      return z.NEVER;
    }
    return n;
  });

const vin = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = normaliserVin(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "VIN invalide (17 caractères, sans I, O ni Q)." });
      return z.NEVER;
    }
    return n;
  });

export const schemaLigneFinancement = z.object({
  partenaireId: z.string().trim().min(1, "Choisissez qui finance."),
  montant: montant("Le montant"),
  note: texteOptionnel(300),
});

/** Échéances et entretien (aussi modifiables seules depuis l'onglet Entretien). */
export const schemaEcheances = z.object({
  kilometrageActuel: entierOptionnel("Le kilométrage actuel", 0, 2_000_000),
  dateProchainControleTechnique: dateOptionnelle("La date du contrôle technique"),
  assureur: texteOptionnel(100),
  numeroPoliceAssurance: texteOptionnel(60),
  dateEcheanceAssurance: dateOptionnelle("L'échéance d'assurance"),
  dateProchaineVidange: dateOptionnelle("La date de vidange"),
  kmProchaineVidange: entierOptionnel("Le kilométrage de vidange", 0, 2_000_000),
  dateProchaineRevision: dateOptionnelle("La date de révision"),
  kmProchaineRevision: entierOptionnel("Le kilométrage de révision", 0, 2_000_000),
});

export const schemaVehicule = z
  .object({
    // Identité
    marque: texte("La marque", 60),
    modele: texte("Le modèle", 80),
    version: texteOptionnel(120),
    immatriculation,
    vin,
    annee: entierOptionnel("L'année", 1950, anneeMax),
    dateMiseEnCirculation: dateOptionnelle("La date de 1re mise en circulation"),
    carburant: choixOptionnel(CARBURANTS),
    boite: choixOptionnel(BOITES),
    couleur: texteOptionnel(40),
    nombrePlaces: entierOptionnel("Le nombre de places", 1, 9),
    puissanceFiscale: entierOptionnel("La puissance fiscale", 1, 99),
    critAir: choixOptionnel(CRITAIRS),
    // Exploitation
    typeExploitation: z.enum(TYPES_EXPLOITATION),
    statutInitial: z.enum(STATUTS_INITIAUX).optional(),
    // Achat
    dateAchat: dateCalendaire("La date d'achat"),
    prixAchat: montant("Le prix d'achat"),
    kilometrageAchat: entierOptionnel("Le kilométrage à l'achat", 0, 2_000_000),
    provenance: choixOptionnel(PROVENANCES),
    nomVendeur: texteOptionnel(120),
    lienAnnonce: urlOptionnelle,
    notesAchat: texteOptionnel(2000),
    // Vente
    prixCible: montantOptionnel("Le prix cible"),
    // Location (valeurs par défaut des contrats)
    tarifJournalier: montantOptionnel("Le tarif journalier"),
    tarifHebdo: montantOptionnel("Le tarif hebdomadaire"),
    tarifMensuel: montantOptionnel("Le tarif mensuel"),
    kmInclusParJour: entierOptionnel("Les km inclus par jour", 0, 10_000),
    kmInclusParMois: entierOptionnel("Les km inclus par mois", 0, 100_000),
    prixKmSup: montantOptionnel("Le prix du km supplémentaire"),
    cautionDefaut: montantOptionnel("La caution"),
    franchiseDefaut: montantOptionnel("La franchise"),
    dateMiseEnLocation: dateOptionnelle("La date de mise en location"),
    // Échéances
    ...schemaEcheances.shape,
    notes: texteOptionnel(5000),
    // Financement
    financement: z.array(schemaLigneFinancement).max(20),
    forcerEcart: z.boolean(),
    motifEcart: texteOptionnel(500),
  })
  .superRefine((v, ctx) => {
    const doubles = new Set(partenairesEnDouble(v.financement.map((l) => ({ partenaireId: l.partenaireId, montantCentimes: l.montant }))));
    const vus = new Set<string>();
    v.financement.forEach((l, i) => {
      if (doubles.has(l.partenaireId) && vus.has(l.partenaireId)) {
        ctx.addIssue({
          code: "custom",
          path: ["financement", i, "partenaireId"],
          message: "Ce financeur apparaît deux fois : regroupez ses montants sur une seule ligne.",
        });
      }
      vus.add(l.partenaireId);
    });
    const resume = resumerFinancement(v.prixAchat, v.financement.map((l) => ({ partenaireId: l.partenaireId, montantCentimes: l.montant })));
    if (resume.etat !== "complet" && !v.forcerEcart) {
      ctx.addIssue({
        code: "custom",
        path: ["financement"],
        message: `Le total financé (${formatEuros(resume.totalCentimes)}) ne correspond pas au prix d'achat (${formatEuros(v.prixAchat)}). Corrigez les montants ou cochez « Enregistrer avec cet écart ».`,
      });
    }
    if (resume.etat !== "complet" && v.forcerEcart && !v.motifEcart) {
      ctx.addIssue({ code: "custom", path: ["motifEcart"], message: "Expliquez la raison de l'écart." });
    }
  });

export type SaisieVehicule = z.input<typeof schemaVehicule>;
export type DonneesVehicule = z.output<typeof schemaVehicule>;
export type SaisieEcheances = z.input<typeof schemaEcheances>;

export const schemaChangementStatut = z.object({
  statut: z.enum(STATUTS_INITIAUX),
  motif: texteOptionnel(500),
});
export type SaisieChangementStatut = z.input<typeof schemaChangementStatut>;

export const schemaEstimation = z.object({
  montant: montant("La valeur estimée"),
  estimeLe: dateCalendaire("La date d'estimation"),
  source: texteOptionnel(100),
  note: texteOptionnel(500),
});
export type SaisieEstimation = z.input<typeof schemaEstimation>;

export const CATEGORIES_DOCUMENTS_VEHICULE = [
  "CARTE_GRISE",
  "FACTURE_ACHAT",
  "CONTROLE_TECHNIQUE",
  "CERTIFICAT_CESSION",
  "ATTESTATION_ASSURANCE",
  "DOCUMENT_VEHICULE_AUTRE",
] as const;

export const LIBELLES_DOCUMENTS_VEHICULE: Record<(typeof CATEGORIES_DOCUMENTS_VEHICULE)[number], string> = {
  CARTE_GRISE: "Carte grise",
  FACTURE_ACHAT: "Facture d'achat",
  CONTROLE_TECHNIQUE: "Contrôle technique",
  CERTIFICAT_CESSION: "Certificat de cession",
  ATTESTATION_ASSURANCE: "Attestation d'assurance",
  DOCUMENT_VEHICULE_AUTRE: "Autre document",
};
