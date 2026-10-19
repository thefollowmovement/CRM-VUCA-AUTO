// Validation des paiements, prolongations, PV (amendes) et sinistres.
import { z } from "zod";
import { MODES_PAIEMENT } from "./finance";
import { dateCalendaire, dateOptionnelle, identifiant, montant, montantOptionnel, texte, texteOptionnel } from "./communs";
import { dateHeure } from "./location";

export const NATURES_PAIEMENT = ["LOCATION", "FRAIS", "REMBOURSEMENT"] as const;
export const LIBELLES_NATURE_PAIEMENT: Record<string, string> = {
  LOCATION: "Loyer / location",
  FRAIS: "Frais supplémentaires",
  CAUTION_RETENUE: "Caution retenue",
  REMBOURSEMENT: "Remboursement au client",
};

export const schemaPaiement = z.object({
  date: dateCalendaire("La date"),
  montant: montant("Le montant").refine((c) => c > 0, "Le montant doit être supérieur à 0."),
  mode: z.enum(MODES_PAIEMENT, { error: "Choisissez le mode de paiement." }),
  nature: z.enum(NATURES_PAIEMENT),
  reference: texteOptionnel(80),
  note: texteOptionnel(500),
});
export type SaisiePaiement = z.input<typeof schemaPaiement>;

export const schemaProlongation = z.object({ retourPrevuLe: dateHeure("La nouvelle date de retour") });
export type SaisieProlongation = z.input<typeof schemaProlongation>;

// ---------------------------------------------------------------------
//  PV / amendes
// ---------------------------------------------------------------------
export const STATUTS_AMENDE = ["RECUE", "CONDUCTEUR_DESIGNE", "PAYEE", "REFACTUREE"] as const;
export const LIBELLES_STATUT_AMENDE: Record<(typeof STATUTS_AMENDE)[number], string> = {
  RECUE: "Reçue",
  CONDUCTEUR_DESIGNE: "Conducteur désigné",
  PAYEE: "Payée",
  REFACTUREE: "Refacturée",
};

export const schemaAmende = z.object({
  vehiculeId: identifiant("Le véhicule"),
  infractionLe: dateHeure("La date de l'infraction"),
  lieu: texteOptionnel(200),
  montant: montant("Le montant"),
  numeroAvis: texteOptionnel(60),
  dateReception: dateOptionnelle("La date de réception"),
  dateLimite: dateOptionnelle("La date limite"),
  statut: z.enum(STATUTS_AMENDE),
  note: texteOptionnel(1000),
});
export type SaisieAmende = z.input<typeof schemaAmende>;

// ---------------------------------------------------------------------
//  Sinistres
// ---------------------------------------------------------------------
export const STATUTS_SINISTRE = ["DECLARE", "EN_EXPERTISE", "EN_REPARATION", "CLOTURE"] as const;
export const LIBELLES_STATUT_SINISTRE: Record<(typeof STATUTS_SINISTRE)[number], string> = {
  DECLARE: "Déclaré",
  EN_EXPERTISE: "En expertise",
  EN_REPARATION: "En réparation",
  CLOTURE: "Clôturé",
};

export const schemaSinistre = z.object({
  vehiculeId: identifiant("Le véhicule"),
  contratId: z.string().transform((v) => v.trim() || null), // location concernée (facultatif)
  survenuLe: dateHeure("La date du sinistre"),
  lieu: texteOptionnel(200),
  description: texte("La description", 2000),
  coutEstime: montantOptionnel("Le coût estimé"),
  franchiseRefacturee: montantOptionnel("La franchise refacturée"),
  declareAssurance: z.boolean(),
  numeroDossierAssurance: texteOptionnel(60),
  indemniteAssurance: montantOptionnel("L'indemnité d'assurance"),
  statut: z.enum(STATUTS_SINISTRE),
  note: texteOptionnel(1000),
});
export type SaisieSinistre = z.input<typeof schemaSinistre>;

export const schemaAnnulationFacture = z.object({ motif: texte("Le motif", 300) });
