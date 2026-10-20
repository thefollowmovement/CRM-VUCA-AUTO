// Valeurs proposées dans l'onglet « Site web ». Rien n'est affiché sur le site
// sans avoir été activé dans le CRM (les engagements sont tous désactivés au départ).

export const ICONES_ENGAGEMENT = ["badge-check", "file-search", "car", "repeat", "shield-check", "wrench", "truck", "hand-coins", "clock", "star"] as const;
export type IconeEngagement = (typeof ICONES_ENGAGEMENT)[number];
export const LIBELLES_ICONES: Record<IconeEngagement, string> = {
  "badge-check": "Coche (contrôle)",
  "file-search": "Document (historique)",
  car: "Voiture (essai)",
  repeat: "Flèches (reprise)",
  "shield-check": "Bouclier (sécurité)",
  wrench: "Clé (entretien)",
  truck: "Camion (livraison)",
  "hand-coins": "Main et pièces (paiement)",
  clock: "Horloge (rapidité)",
  star: "Étoile",
};

export type Engagement = { icone: IconeEngagement; titre: string; phrase: string; actif: boolean };
export const ENGAGEMENTS_PROPOSES: Engagement[] = [
  { icone: "badge-check", titre: "Véhicules contrôlés", phrase: "Chaque véhicule est vérifié avant d'être mis en vente.", actif: false },
  { icone: "file-search", titre: "Historique transparent", phrase: "Entretien, contrôle technique et kilométrage : on vous montre tout.", actif: false },
  { icone: "car", titre: "Essai possible sur rendez-vous", phrase: "Venez voir et essayer le véhicule avant de vous décider.", actif: false },
  { icone: "repeat", titre: "Reprise de votre véhicule", phrase: "Nous pouvons reprendre votre véhicule actuel.", actif: false },
  { icone: "shield-check", titre: "Paiement sécurisé", phrase: "Virement ou chèque de banque, avec facture et certificat de cession.", actif: false },
];

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;
export type Horaire = { jour: (typeof JOURS)[number]; ouvert: boolean; plages: string };
export const HORAIRES_VIDES: Horaire[] = JOURS.map((jour) => ({ jour, ouvert: false, plages: "" }));

export const MOYENS_PAIEMENT_PROPOSES = ["Virement bancaire", "Chèque de banque", "Espèces (dans la limite légale)", "Carte bancaire", "Financement / crédit"];

export const RESEAUX = ["instagram", "tiktok", "facebook", "leboncoin", "lacentrale"] as const;
export type Reseau = (typeof RESEAUX)[number];
export const LIBELLES_RESEAUX: Record<Reseau, string> = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", leboncoin: "Leboncoin", lacentrale: "La Centrale" };

export type QuestionFaq = { question: string; reponse: string };

/** Lecture tolérante des listes JSON enregistrées (valeurs inattendues ignorées). */
export function lireEngagements(brut: unknown): Engagement[] {
  if (!Array.isArray(brut)) return [];
  return brut
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      icone: (ICONES_ENGAGEMENT as readonly string[]).includes(String(e.icone)) ? (e.icone as IconeEngagement) : "badge-check",
      titre: String(e.titre ?? "").slice(0, 80),
      phrase: String(e.phrase ?? "").slice(0, 200),
      actif: e.actif === true,
    }))
    .filter((e) => e.titre);
}
export function lireHoraires(brut: unknown): Horaire[] {
  const liste = Array.isArray(brut) ? brut : [];
  return JOURS.map((jour) => {
    const h = liste.find((x) => x && typeof x === "object" && (x as Horaire).jour === jour) as Partial<Horaire> | undefined;
    return { jour, ouvert: h?.ouvert === true, plages: String(h?.plages ?? "").slice(0, 60) };
  });
}
export function lireFaq(brut: unknown): QuestionFaq[] {
  if (!Array.isArray(brut)) return [];
  return brut
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => ({ question: String(q.question ?? "").slice(0, 200), reponse: String(q.reponse ?? "").slice(0, 2000) }))
    .filter((q) => q.question && q.reponse);
}
export function lireListe(brut: unknown, max = 20): string[] {
  return Array.isArray(brut) ? brut.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 80)).slice(0, max) : [];
}
export function lireReseaux(brut: unknown): Record<Reseau, string> {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  return Object.fromEntries(RESEAUX.map((r) => [r, typeof o[r] === "string" ? (o[r] as string).slice(0, 300) : ""])) as Record<Reseau, string>;
}

/** Titre et description de l'accueil pour Google quand rien n'est saisi (site + aperçu dans le CRM). */
export function seoParDefaut(nom: string): { titre: string; description: string } {
  return {
    titre: `${nom} — Voitures d'occasion`,
    description: `${nom} : voitures d'occasion contrôlées, photos réelles et prix affichés. Contact direct sur WhatsApp.`,
  };
}
