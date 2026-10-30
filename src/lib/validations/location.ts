// Validation des clients et des contrats de location (partagée client / serveur).
import { z } from "zod";
import { saisieParisVersDate } from "@/lib/dates";
import {
  choixOptionnel,
  dateOptionnelle,
  emailOptionnel,
  entierOptionnel,
  identifiant,
  montant,
  montantOptionnel,
  texte,
  texteOptionnel,
} from "./communs";

// ---------------------------------------------------------------------
//  Référentiels et libellés
// ---------------------------------------------------------------------
export const CIVILITES = ["M", "MME"] as const;
export const LIBELLES_CIVILITE: Record<(typeof CIVILITES)[number], string> = { M: "M.", MME: "Mme" };

export const TYPES_PIECE = ["CARTE_IDENTITE", "PASSEPORT", "TITRE_SEJOUR", "AUTRE"] as const;
export const LIBELLES_PIECE: Record<(typeof TYPES_PIECE)[number], string> = {
  CARTE_IDENTITE: "Carte d'identité",
  PASSEPORT: "Passeport",
  TITRE_SEJOUR: "Titre de séjour",
  AUTRE: "Autre",
};

export const CATEGORIES_DOCUMENTS_CLIENT = [
  "PERMIS_RECTO",
  "PERMIS_VERSO",
  "PIECE_IDENTITE_RECTO",
  "PIECE_IDENTITE_VERSO",
  "JUSTIFICATIF_DOMICILE",
  "DOCUMENT_CLIENT_AUTRE",
] as const;
export const LIBELLES_DOCUMENTS_CLIENT: Record<(typeof CATEGORIES_DOCUMENTS_CLIENT)[number], string> = {
  PERMIS_RECTO: "Permis (recto)",
  PERMIS_VERSO: "Permis (verso)",
  PIECE_IDENTITE_RECTO: "Pièce d'identité (recto)",
  PIECE_IDENTITE_VERSO: "Pièce d'identité (verso)",
  JUSTIFICATIF_DOMICILE: "Justificatif de domicile",
  DOCUMENT_CLIENT_AUTRE: "Autre document",
};

export const TYPES_LOCATION = ["JOURNALIERE", "HEBDOMADAIRE", "MENSUELLE"] as const;
export const LIBELLES_TYPE_LOCATION: Record<(typeof TYPES_LOCATION)[number], string> = {
  JOURNALIERE: "Journalière",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUELLE: "Mensuelle",
};
/** Unité de prix selon le type de location. */
export const UNITE_TYPE_LOCATION: Record<(typeof TYPES_LOCATION)[number], [string, string]> = {
  JOURNALIERE: ["jour", "jours"],
  HEBDOMADAIRE: ["semaine", "semaines"],
  MENSUELLE: ["mois", "mois"],
};

export const MODES_CAUTION = ["EMPREINTE_CB", "CHEQUE", "ESPECES", "VIREMENT"] as const;
export const LIBELLES_MODE_CAUTION: Record<(typeof MODES_CAUTION)[number], string> = {
  EMPREINTE_CB: "Empreinte CB",
  CHEQUE: "Chèque",
  ESPECES: "Espèces",
  VIREMENT: "Virement",
};

// ---------------------------------------------------------------------
//  Client
// ---------------------------------------------------------------------
export const schemaClient = z
  .object({
    civilite: choixOptionnel(CIVILITES),
    nom: texte("Le nom", 80),
    prenom: texteOptionnel(80),
    dateNaissance: dateOptionnelle("La date de naissance"),
    lieuNaissance: texteOptionnel(120),
    paysNaissance: texteOptionnel(60),
    adresse: texteOptionnel(300),
    adresseComplement: texteOptionnel(200),
    codePostal: texteOptionnel(10),
    ville: texteOptionnel(80),
    pays: texteOptionnel(60),
    telephone: texteOptionnel(30),
    email: emailOptionnel,
    numeroPermis: texteOptionnel(40),
    dateObtentionPermis: dateOptionnelle("La date d'obtention"),
    dateDelivrancePermis: dateOptionnelle("La date de délivrance"),
    paysDelivrancePermis: texteOptionnel(60),
    categoriePermis: texteOptionnel(20),
    dateValiditePermis: dateOptionnelle("La date de validité"),
    typePieceIdentite: choixOptionnel(TYPES_PIECE),
    numeroPieceIdentite: texteOptionnel(40),
    dateValiditePieceIdentite: dateOptionnelle("La date de validité"),
    entreprise: texteOptionnel(120),
    siretEntreprise: texteOptionnel(20),
    listeNoire: z.boolean(),
    motifListeNoire: texteOptionnel(500),
    notes: texteOptionnel(2000),
  })
  .superRefine((c, ctx) => {
    if (c.listeNoire && !c.motifListeNoire) {
      ctx.addIssue({ code: "custom", path: ["motifListeNoire"], message: "Indiquez le motif de la mise en liste noire." });
    }
    if (c.dateNaissance && c.dateNaissance > new Date()) {
      ctx.addIssue({ code: "custom", path: ["dateNaissance"], message: "La date de naissance est dans le futur." });
    }
    if (c.dateDelivrancePermis && c.dateDelivrancePermis > new Date()) {
      ctx.addIssue({ code: "custom", path: ["dateDelivrancePermis"], message: "La date de délivrance est dans le futur." });
    }
    if (c.dateObtentionPermis && c.dateObtentionPermis > new Date()) {
      ctx.addIssue({ code: "custom", path: ["dateObtentionPermis"], message: "La date d'obtention est dans le futur." });
    }
  });
export type SaisieClient = z.input<typeof schemaClient>;

// ---------------------------------------------------------------------
//  Contrat de location
// ---------------------------------------------------------------------

/** Date + heure saisies à l'heure de Paris (« 2026-10-20T09:30 ») → Date UTC. */
export const dateHeure = (libelle: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = saisieParisVersDate(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: `${libelle} est invalide.` });
        return z.NEVER;
      }
      return d;
    });

export const schemaContrat = z
  .object({
    clientId: identifiant("Le client"),
    conducteursIds: z.array(z.string()).max(5),
    vehiculeId: identifiant("Le véhicule"),
    type: z.enum(TYPES_LOCATION),
    statut: z.enum(["RESERVATION", "CONFIRMEE"]),
    departPrevuLe: dateHeure("La date de départ"),
    retourPrevuLe: dateHeure("La date de retour"),
    lieuDepart: texteOptionnel(200),
    lieuRetour: texteOptionnel(200),
    livraison: z.boolean(),
    fraisLivraison: montantOptionnel("Les frais de livraison"),
    tarif: montant("Le tarif"),
    tarifJournalier: montantOptionnel("Le tarif journalier"),
    remise: montantOptionnel("La remise"),
    kilometrageIllimite: z.boolean(),
    kmInclusParUnite: entierOptionnel("Les km inclus", 0, 100_000),
    prixKmSup: montantOptionnel("Le prix du km supplémentaire"),
    caution: montantOptionnel("La caution"),
    modeCaution: choixOptionnel(MODES_CAUTION),
    franchise: montantOptionnel("La franchise"),
    acompte: montantOptionnel("L'acompte"),
    jourEcheanceMensuelle: entierOptionnel("Le jour d'échéance", 1, 28),
    options: z.array(z.object({ optionId: identifiant("L'option"), quantite: z.coerce.number().int().min(1).max(10) })).max(20),
    notes: texteOptionnel(2000),
  })
  .superRefine((c, ctx) => {
    if (c.retourPrevuLe <= c.departPrevuLe) {
      ctx.addIssue({ code: "custom", path: ["retourPrevuLe"], message: "Le retour doit être après le départ." });
    }
    if (c.tarif <= 0) ctx.addIssue({ code: "custom", path: ["tarif"], message: "Le tarif doit être supérieur à 0." });
    if (c.conducteursIds.includes(c.clientId)) {
      ctx.addIssue({ code: "custom", path: ["conducteursIds"], message: "Le conducteur principal est déjà le client." });
    }
    if (new Set(c.conducteursIds).size !== c.conducteursIds.length) {
      ctx.addIssue({ code: "custom", path: ["conducteursIds"], message: "Conducteur en double." });
    }
    if (new Set(c.options.map((o) => o.optionId)).size !== c.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Option en double." });
    }
  });
export type SaisieContrat = z.input<typeof schemaContrat>;
export type DonneesContrat = z.output<typeof schemaContrat>;

export const schemaAnnulation = z.object({ motif: texte("Le motif", 500) });
