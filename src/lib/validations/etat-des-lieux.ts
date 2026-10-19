// Validation des états des lieux, dommages et frais (partagée client / serveur).
import { z } from "zod";
import { GRAVITES, TYPES_DOMMAGE, VUES } from "@/lib/schema-vehicule";
import { entierOptionnel, identifiant, montant, texte, texteOptionnel } from "./communs";

export const PROPRETES = ["PROPRE", "CORRECT", "SALE"] as const;
export const LIBELLES_PROPRETE: Record<(typeof PROPRETES)[number], string> = { PROPRE: "Propre", CORRECT: "Correct", SALE: "Sale" };

export const TYPES_FRAIS = ["KM_SUPPLEMENTAIRES", "CARBURANT", "NETTOYAGE", "DOMMAGES", "RETARD", "LIVRAISON", "AMENDE_REFACTUREE", "FRAIS_DOSSIER", "AUTRE"] as const;
export const LIBELLES_TYPE_FRAIS: Record<(typeof TYPES_FRAIS)[number], string> = {
  KM_SUPPLEMENTAIRES: "Km supplémentaires",
  CARBURANT: "Carburant / recharge",
  NETTOYAGE: "Nettoyage",
  DOMMAGES: "Dommages",
  RETARD: "Retard",
  LIVRAISON: "Livraison",
  AMENDE_REFACTUREE: "Amende refacturée",
  FRAIS_DOSSIER: "Frais de dossier",
  AUTRE: "Autre",
};

export const DECISIONS_CAUTION = ["RESTITUEE", "RETENUE_PARTIELLE", "RETENUE_TOTALE"] as const;
export const LIBELLES_STATUT_CAUTION = {
  A_ENCAISSER: "À encaisser",
  ENCAISSEE: "Encaissée",
  RESTITUEE: "Restituée",
  RETENUE_PARTIELLE: "Retenue en partie",
  RETENUE_TOTALE: "Retenue en totalité",
} as const;

/** Photos guidées obligatoires (le compteur est demandé à la première étape). */
export const PHOTOS_GUIDEES = [
  { categorie: "EDL_AVANT", libelle: "Avant" },
  { categorie: "EDL_ARRIERE", libelle: "Arrière" },
  { categorie: "EDL_COTE_GAUCHE", libelle: "Côté gauche" },
  { categorie: "EDL_COTE_DROIT", libelle: "Côté droit" },
  { categorie: "EDL_INTERIEUR_AVANT", libelle: "Intérieur avant" },
  { categorie: "EDL_INTERIEUR_ARRIERE", libelle: "Intérieur arrière" },
] as const;
export const CATEGORIES_PHOTOS_OBLIGATOIRES = ["EDL_COMPTEUR", ...PHOTOS_GUIDEES.map((p) => p.categorie)] as const;
export const CATEGORIES_PHOTOS_EDL = [...CATEGORIES_PHOTOS_OBLIGATOIRES, "EDL_LIBRE"] as const;
export type CategoriePhotoEdl = (typeof CATEGORIES_PHOTOS_EDL)[number];

// ---------------------------------------------------------------------
//  Dommage (touché sur le schéma)
// ---------------------------------------------------------------------
export const schemaDommage = z.object({
  vehiculeId: identifiant("Le véhicule"),
  etatDesLieuxId: z.string().nullable(),
  vue: z.enum(VUES as [string, ...string[]]),
  zone: texte("La zone", 60),
  positionX: z.number().min(0).max(1).nullable(),
  positionY: z.number().min(0).max(1).nullable(),
  type: z.enum(TYPES_DOMMAGE as [string, ...string[]], { error: "Choisissez le type de dommage." }),
  gravite: z.enum(GRAVITES as [string, ...string[]]),
  description: texteOptionnel(500),
});
export type SaisieDommage = z.input<typeof schemaDommage>;

// ---------------------------------------------------------------------
//  État des lieux (validation finale, après signatures)
// ---------------------------------------------------------------------
const ligneFrais = z.object({
  type: z.enum(TYPES_FRAIS),
  libelle: texte("Le libellé", 200),
  quantite: z.coerce.number({ error: "Quantité invalide." }).int("Quantité invalide.").min(0).max(100_000),
  prixUnitaire: montant("Le prix unitaire"),
  dommageId: z.string().nullable(),
});

/** Frais ajouté à la main sur un contrat. */
export const schemaFrais = z.object({
  type: z.enum(TYPES_FRAIS),
  libelle: texte("Le libellé", 200),
  quantite: z.coerce.number({ error: "Quantité invalide." }).int("Quantité invalide.").min(1, "Quantité minimum : 1.").max(100_000),
  prixUnitaire: montant("Le prix unitaire"),
});
export type SaisieFrais = z.input<typeof schemaFrais>;

export const schemaEtatDesLieux = z
  .object({
    kilometrage: entierOptionnel("Le kilométrage", 0, 2_000_000),
    niveauCarburantHuitiemes: z.number().int().min(0).max(8).nullable(),
    niveauBatteriePct: entierOptionnel("Le niveau de batterie", 0, 100),
    propreteInterieure: z.enum(PROPRETES, { error: "Indiquez la propreté intérieure." }),
    propreteExterieure: z.enum(PROPRETES, { error: "Indiquez la propreté extérieure." }),
    checklist: z.array(z.object({ elementId: z.string().nullable(), libelle: texte("L'élément", 120), present: z.boolean(), quantite: z.number().int().min(0).max(20).nullable() })).max(40),
    remarques: texteOptionnel(2000),
    nomSignataireClient: texte("Le nom du signataire", 120),
    // Départ
    cautionEncaissee: z.boolean(),
    // Retour
    frais: z.array(ligneFrais).max(40),
    decisionCaution: z.enum(DECISIONS_CAUTION).nullable(),
    montantRetenu: z.string(),
    motifRetenue: texteOptionnel(500),
  })
  .superRefine((v, ctx) => {
    if (v.kilometrage === null) ctx.addIssue({ code: "custom", path: ["kilometrage"], message: "Le kilométrage est obligatoire." });
  });
export type SaisieEtatDesLieux = z.input<typeof schemaEtatDesLieux>;
