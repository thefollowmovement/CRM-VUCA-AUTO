// Catalogue des équipements proposés dans l'onglet « Annonce » (cases à cocher par catégorie).

export const CATEGORIES_EQUIPEMENTS = {
  confort: {
    libelle: "Confort",
    items: [
      "Climatisation", "Climatisation automatique", "Sièges chauffants", "Volant chauffant", "Régulateur de vitesse", "Régulateur adaptatif",
      "Limiteur de vitesse", "Démarrage sans clé", "Accès sans clé", "Vitres électriques", "Rétroviseurs électriques", "Rétroviseurs rabattables",
      "Toit ouvrant", "Toit panoramique", "Sièges en cuir", "Siège conducteur électrique", "Accoudoir central", "Banquette rabattable",
    ],
  },
  securite: {
    libelle: "Sécurité",
    items: [
      "ABS", "ESP", "Airbags frontaux", "Airbags latéraux", "Airbags rideaux", "Aide au stationnement arrière", "Aide au stationnement avant",
      "Caméra de recul", "Caméra 360°", "Freinage d'urgence automatique", "Alerte de franchissement de ligne", "Maintien dans la voie",
      "Surveillance des angles morts", "Reconnaissance des panneaux", "Détecteur de fatigue", "Fixations Isofix", "Allumage automatique des feux",
      "Capteur de pluie",
    ],
  },
  multimedia: {
    libelle: "Multimédia",
    items: [
      "Écran tactile", "GPS", "Apple CarPlay", "Android Auto", "Bluetooth", "Prise USB", "Recharge sans fil", "Commandes au volant",
      "Système audio premium", "Compteur numérique", "Affichage tête haute", "Radio DAB",
    ],
  },
  exterieur: {
    libelle: "Extérieur",
    items: [
      "Jantes alliage", "Feux LED", "Phares Full LED", "Feux antibrouillard", "Vitres arrière surteintées", "Barres de toit", "Attelage",
      "Peinture métallisée", "Hayon électrique", "Roue de secours",
    ],
  },
} as const;

export type CategorieEquipement = keyof typeof CATEGORIES_EQUIPEMENTS;
export const ORDRE_CATEGORIES: CategorieEquipement[] = ["confort", "securite", "multimedia", "exterieur"];

/** Équipements d'une annonce : cases cochées par catégorie + ajouts libres. */
export type Equipements = Record<CategorieEquipement, string[]> & { autres: string[] };

const propre = (v: unknown, max = 80): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, max)).filter(Boolean))].slice(0, 60)
    : [];

/** Valeur JSON quelconque → structure sûre (chaînes courtes, sans doublons). */
export function normaliserEquipements(brut: unknown): Equipements {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  return { confort: propre(o.confort), securite: propre(o.securite), multimedia: propre(o.multimedia), exterieur: propre(o.exterieur), autres: propre(o.autres) };
}

/** Nombre total d'équipements renseignés. */
export function nombreEquipements(e: Equipements): number {
  return ORDRE_CATEGORIES.reduce((a, c) => a + e[c].length, 0) + e.autres.length;
}
