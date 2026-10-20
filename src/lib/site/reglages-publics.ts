// Réglages du site tels que les pages publiques les reçoivent (aucun champ interne).
import type { Engagement, Horaire, QuestionFaq, Reseau } from "./reglages-defaut";

export type ReglagesPublics = {
  enLigne: boolean;
  nom: string;
  slogan: string | null;
  accent: string;
  surAccent: string;
  logoClairId: string | null;
  logoFonceId: string | null;
  whatsapp: string | null;
  messageWhatsappGeneral: string;
  messageWhatsappVehicule: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  lienGoogleMaps: string | null;
  horaires: Horaire[];
  delaiReponse: string | null;
  vendeurNom: string | null;
  vendeurPhotoId: string | null;
  siret: string | null;
  formeJuridique: string | null;
  engagements: Engagement[]; // uniquement ceux activés
  moyensPaiement: string[];
  livraison: boolean;
  zoneLivraison: string | null;
  reprise: boolean;
  lienAvisGoogle: string | null;
  anneeCreation: number | null;
  accueilTitre: string | null;
  accueilSousTitre: string | null;
  bandeau: string | null;
  reseaux: Partial<Record<Reseau, string>>;
  faq: QuestionFaq[];
};

/** Avis client tel qu'affiché sur le site. */
export type AvisPublic = { auteur: string; note: number; texte: string; date: string; vehiculeAchete: string | null; source: string };
