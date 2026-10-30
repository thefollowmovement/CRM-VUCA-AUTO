// Schémas Zod du module Amendes (corrections dans « À valider », réglages).
import { z } from "zod";
import { dateOptionnelle, emailOptionnel, montantOptionnel, texte, texteOptionnel } from "./communs";

export const TYPES_AVIS = ["CONTRAVENTION", "AMENDE_FORFAITAIRE_DELICTUELLE", "AMENDE_MAJOREE", "AUTRE"] as const;
export const LIBELLES_TYPE_AVIS: Record<(typeof TYPES_AVIS)[number], string> = {
  CONTRAVENTION: "Avis de contravention",
  AMENDE_FORFAITAIRE_DELICTUELLE: "Amende forfaitaire délictuelle",
  AMENDE_MAJOREE: "Amende majorée",
  AUTRE: "Autre",
};

/** Correction (ou confirmation) des champs lus sur un avis. */
export const schemaCorrectionAmende = z.object({
  numeroAvis: texteOptionnel(30).transform((v) => (v ? v.replace(/[\s.-]/g, "") : null)),
  dateAvis: dateOptionnelle("La date de l'avis"),
  dateInfraction: dateOptionnelle("La date de l'infraction"),
  heureInfraction: z
    .string()
    .trim()
    .refine((v) => v === "" || /^([01]?\d|2[0-3]):[0-5]\d$/.test(v), "Heure invalide (ex. 14:32).")
    .transform((v) => (v === "" ? null : v)),
  immatriculation: texteOptionnel(20),
  nature: texteOptionnel(200),
  lieu: texteOptionnel(200),
  montant: montantOptionnel("Le montant"),
});
export type SaisieCorrectionAmende = z.input<typeof schemaCorrectionAmende>;

/** Paramètres › Amendes (champs vides = reprend les informations « Société »). */
export const schemaReglagesAmendes = z.object({
  amendesRaisonSociale: texteOptionnel(120),
  amendesAdresse: texteOptionnel(200),
  amendesAdresseComplement: texteOptionnel(200),
  amendesCodePostal: texteOptionnel(10),
  amendesVille: texteOptionnel(100),
  amendesEmail: emailOptionnel,
  amendesFraisGestionCentimes: montantOptionnel("Les frais de gestion").transform((v) => v ?? 0),
  amendesModele: texte("Le modèle", 60).regex(/^claude-[a-z0-9.-]+$/, "Identifiant de modèle invalide (ex. claude-haiku-5-5)."),
});
export type SaisieReglagesAmendes = z.input<typeof schemaReglagesAmendes>;
