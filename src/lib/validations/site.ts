// Validation des annonces et des réglages du site public (partagée formulaire / serveur).
import { z } from "zod";
import { CATEGORIES_EQUIPEMENTS } from "@/lib/site/equipements";
import { ICONES_ENGAGEMENT, JOURS, RESEAUX } from "@/lib/site/reglages-defaut";
import { LONGUEUR_MAX_LEGAL } from "@/lib/site/legal";
import { LONGUEUR_MAX_DESCRIPTION, nettoyerTexteRiche } from "@/lib/site/texte-riche";
import { normaliserNumero } from "@/lib/site/whatsapp";
import { dateCalendaire, dateOptionnelle, emailOptionnel, entierOptionnel, montantOptionnel, texte, texteOptionnel, urlOptionnelle } from "./communs";

const liste = (max = 60) => z.array(z.string().trim().max(80)).max(max).transform((l) => [...new Set(l.filter(Boolean))]);

// ---------------------------------------------------------------------
//  Annonce (onglet « Annonce » de la fiche véhicule)
// ---------------------------------------------------------------------
export const schemaAnnonce = z.object({
  titre: texte("Le titre", 120),
  prixAffiche: montantOptionnel("Le prix affiché"),
  prixNegociable: z.boolean(),
  puissanceCh: entierOptionnel("La puissance", 1, 2000),
  description: z
    .string()
    .max(LONGUEUR_MAX_DESCRIPTION + 500)
    .transform((v) => nettoyerTexteRiche(v) || null),
  equipements: z.object({
    confort: liste(),
    securite: liste(),
    multimedia: liste(),
    exterieur: liste(),
    autres: liste(30),
  }),
  ctAJour: z.boolean(),
  ctDate: dateOptionnelle("La date du contrôle technique"),
  carnetEntretien: z.boolean(),
  rapportHistovec: z.boolean(),
  nombreProprietaires: entierOptionnel("Le nombre de propriétaires", 1, 20),
  premiereMain: z.boolean(),
  garantie: z.boolean(),
  garantieMois: entierOptionnel("La durée de garantie", 1, 120),
  garantieTexte: texteOptionnel(200),
  nonFumeur: z.boolean(),
  reviseAvantVente: z.boolean(),
  travauxRealises: texteOptionnel(1000),
  kilometrageVerifie: z.boolean(),
  sourceKilometrage: texteOptionnel(200),
}).superRefine((a, ctx) => {
  if (a.garantie && !a.garantieMois) ctx.addIssue({ code: "custom", path: ["garantieMois"], message: "Indiquez la durée de la garantie (en mois)." });
});
export type SaisieAnnonce = z.input<typeof schemaAnnonce>;

/** Catégories d'équipements reconnues (les cases cochées hors catalogue vont dans « autres »). */
export const CLES_EQUIPEMENTS = Object.keys(CATEGORIES_EQUIPEMENTS) as (keyof typeof CATEGORIES_EQUIPEMENTS)[];

/** Recadrage 4:3 d'une photo, en % de l'image. */
export const schemaRecadrage = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), l: z.number().min(10).max(100) });
export type Recadrage = z.infer<typeof schemaRecadrage>;

// ---------------------------------------------------------------------
//  Réglages du site (onglet « Site web »)
// ---------------------------------------------------------------------
const numeroWhatsapp = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normaliserNumero(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Numéro invalide : format international attendu, ex. +33 6 12 34 56 78." });
      return z.NEVER;
    }
    return n;
  });

export const schemaSiteGeneral = z.object({
  enLigne: z.boolean(),
  nomAffiche: texte("Le nom affiché", 60),
  slogan: texteOptionnel(120),
  couleurAccent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format #0071E3)."),
});
export type SaisieSiteGeneral = z.input<typeof schemaSiteGeneral>;

export const schemaSiteContact = z.object({
  whatsapp: numeroWhatsapp,
  messageWhatsappVehicule: texte("Le message pour un véhicule", 500),
  messageWhatsappGeneral: texte("Le message général", 500),
  telephone: texteOptionnel(30),
  email: emailOptionnel,
  adresse: texteOptionnel(300),
  lienGoogleMaps: urlOptionnelle,
  horaires: z.array(z.object({ jour: z.enum(JOURS), ouvert: z.boolean(), plages: z.string().trim().max(60) })).length(7),
  delaiReponse: texteOptionnel(80),
  vendeurNom: texteOptionnel(60),
});
export type SaisieSiteContact = z.input<typeof schemaSiteContact>;

export const schemaSiteConfiance = z.object({
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{14}$/.test(v), "Le SIRET compte 14 chiffres.")
    .transform((v) => v || null),
  formeJuridique: texteOptionnel(60),
  adresseSiege: texteOptionnel(300),
  engagements: z
    .array(z.object({ icone: z.enum(ICONES_ENGAGEMENT), titre: z.string().trim().min(1, "Titre obligatoire.").max(80), phrase: z.string().trim().max(200), actif: z.boolean() }))
    .max(12),
  moyensPaiement: liste(10),
  livraison: z.boolean(),
  zoneLivraison: texteOptionnel(120),
  reprise: z.boolean(),
  lienAvisGoogle: urlOptionnelle,
  afficherVendus: z.boolean(),
  joursVendus: z.coerce.number().int().min(1, "Au moins 1 jour.").max(365, "365 jours maximum."),
  afficherNombreVendus: z.boolean(),
  seuilNombreVendus: z.coerce.number().int().min(1).max(10000),
  anneeCreation: entierOptionnel("L'année de création", 1950, 2100),
  immatriculationVisible: z.boolean(),
});
export type SaisieSiteConfiance = z.input<typeof schemaSiteConfiance>;

export const schemaSiteContenu = z.object({
  accueilTitre: texteOptionnel(120),
  accueilSousTitre: texteOptionnel(300),
  aProposTexte: texteOptionnel(5000),
  faq: z.array(z.object({ question: z.string().trim().min(1, "Question obligatoire.").max(200), reponse: z.string().trim().min(1, "Réponse obligatoire.").max(2000) })).max(30),
  bandeau: texteOptionnel(120),
  reseaux: z.object(Object.fromEntries(RESEAUX.map((r) => [r, urlOptionnelle])) as Record<(typeof RESEAUX)[number], typeof urlOptionnelle>),
});
export type SaisieSiteContenu = z.input<typeof schemaSiteContenu>;

export const schemaSiteReferencement = z.object({
  seoTitre: texteOptionnel(70),
  seoDescription: texteOptionnel(170),
  plausibleDomaine: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v), "Domaine invalide (ex. vuca-auto.fr).")
    .transform((v) => v || null),
  googleAnalyticsId: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^G-[A-Z0-9]{4,}$/.test(v), "Identifiant invalide (ex. G-ABC123XYZ).")
    .transform((v) => v || null),
});
export type SaisieSiteReferencement = z.input<typeof schemaSiteReferencement>;

const texteLegal = z
  .string()
  .max(LONGUEUR_MAX_LEGAL + 500, "Texte trop long.")
  .transform((v) => nettoyerTexteRiche(v, LONGUEUR_MAX_LEGAL) || null);
export const schemaSiteLegal = z.object({ mentionsLegales: texteLegal, confidentialite: texteLegal });
export type SaisieSiteLegal = z.input<typeof schemaSiteLegal>;

// ---------------------------------------------------------------------
//  Avis client (réels uniquement)
// ---------------------------------------------------------------------
export const SOURCES_AVIS = ["GOOGLE", "LEBONCOIN", "DIRECT"] as const;
export const LIBELLES_SOURCE_AVIS: Record<(typeof SOURCES_AVIS)[number], string> = { GOOGLE: "Google", LEBONCOIN: "Leboncoin", DIRECT: "Direct" };

export const schemaAvis = z.object({
  auteur: z
    .string()
    .trim()
    .min(2, "Indiquez le prénom et l'initiale (ex. Marie D.).")
    .max(40),
  note: z.coerce.number().int().min(1, "Note de 1 à 5.").max(5, "Note de 1 à 5."),
  texte: texte("Le texte de l'avis", 1500),
  date: dateCalendaire("La date"),
  vehiculeAchete: texteOptionnel(80),
  source: z.enum(SOURCES_AVIS),
  certifieAuthentique: z.boolean().refine((v) => v === true, "Cochez « Je certifie que cet avis est authentique » : seuls les avis réels peuvent être publiés."),
  actif: z.boolean(),
});
export type SaisieAvis = z.input<typeof schemaAvis>;
