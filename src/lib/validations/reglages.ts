import { z } from "zod";
import { emailOptionnel, entier, montant, montantOptionnel, texte, texteOptionnel } from "./communs";

export const schemaSociete = z.object({
  societeNom: texte("Le nom de la société", 120),
  societeAdresse: texteOptionnel(200),
  societeCodePostal: texteOptionnel(10),
  societeVille: texteOptionnel(100),
  societeSiret: texteOptionnel(20)
    .transform((v) => (v ? v.replace(/\s/g, "") : null))
    .refine((v) => v === null || /^\d{14}$/.test(v), "Le SIRET doit contenir 14 chiffres."),
  societeTelephone: texteOptionnel(30),
  societeEmail: emailOptionnel,
});

export const schemaDocuments = z.object({
  conditionsGenerales: texteOptionnel(50_000),
  mentionFacture: texteOptionnel(500),
  mentionsContrat: texteOptionnel(5000),
  mentionsEtatDesLieux: texteOptionnel(5000),
});

const prefixe = (libelle: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, `${libelle} : 2 à 6 lettres, sans accent.`);

export const schemaAlertes = z.object({
  prefixeContrat: prefixe("Préfixe des contrats"),
  prefixeFacture: prefixe("Préfixe des factures"),
  prefixeRecu: prefixe("Préfixe des reçus"),
  joursStockAlerte: entier("Jours en stock", 1, 3650),
  joursAvantEcheanceAlerte: entier("Jours avant échéance", 1, 365),
  kmAvantVidangeAlerte: entier("Km avant vidange", 0, 100_000),
  anciennetePermisMinAnnees: entier("Ancienneté du permis", 0, 50),
  toleranceRetardMinutes: entier("Tolérance de retard", 0, 24 * 60),
  jourEcheanceMensuelleDefaut: entier("Jour d'échéance", 1, 28),
  fraisNettoyageCentimes: montant("Les frais de nettoyage"),
  prixHuitiemeCarburantCentimes: montant("Le prix d'un huitième de réservoir"),
  prixPourcentBatterieCentimes: montant("Le prix d'un % de batterie"),
});

export const schemaCategorieDepense = z.object({
  nom: texte("Le nom", 80),
  icone: texteOptionnel(50),
  couleur: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
  ordre: entier("L'ordre", 0, 1000),
  actif: z.boolean(),
});

export const schemaOptionLocation = z.object({
  libelle: texte("Le libellé", 80),
  modeTarif: z.enum(["PAR_JOUR", "FORFAIT"]),
  prix: montant("Le prix"),
  plafond: montantOptionnel("Le plafond"),
  ordre: entier("L'ordre", 0, 1000),
  actif: z.boolean(),
});

export const schemaElementChecklist = z.object({
  libelle: texte("Le libellé", 80),
  avecQuantite: z.boolean(),
  electriqueUniquement: z.boolean(),
  ordre: entier("L'ordre", 0, 1000),
  actif: z.boolean(),
});

export type SaisieSociete = z.input<typeof schemaSociete>;
export type SaisieDocuments = z.input<typeof schemaDocuments>;
export type SaisieAlertes = z.input<typeof schemaAlertes>;
export type SaisieCategorieDepense = z.input<typeof schemaCategorieDepense>;
export type SaisieOptionLocation = z.input<typeof schemaOptionLocation>;
export type SaisieElementChecklist = z.input<typeof schemaElementChecklist>;
