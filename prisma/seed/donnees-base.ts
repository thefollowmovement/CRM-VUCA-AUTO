// Données de référence créées à l'installation (modifiables dans les Réglages).

export const CATEGORIES_DEPENSES = [
  { code: "CARTE_GRISE", nom: "Carte grise", icone: "FileText", couleur: "#2563eb" },
  { code: "MECANIQUE", nom: "Réparation mécanique", icone: "Wrench", couleur: "#dc2626" },
  { code: "CARROSSERIE", nom: "Carrosserie", icone: "SprayCan", couleur: "#ea580c" },
  { code: "PNEUS", nom: "Pneus", icone: "CircleDot", couleur: "#475569" },
  { code: "PIECES", nom: "Pièces", icone: "Cog", couleur: "#7c3aed" },
  { code: "CONTROLE_TECHNIQUE", nom: "Contrôle technique", icone: "ClipboardCheck", couleur: "#0891b2" },
  { code: "ENTRETIEN", nom: "Entretien / vidange", icone: "Droplet", couleur: "#ca8a04" },
  { code: "NETTOYAGE", nom: "Nettoyage / préparation esthétique", icone: "Sparkles", couleur: "#db2777" },
  { code: "TRANSPORT", nom: "Transport / convoyage", icone: "Truck", couleur: "#0d9488" },
  { code: "ASSURANCE", nom: "Assurance", icone: "Shield", couleur: "#4f46e5" },
  { code: "PARKING", nom: "Parking / stockage", icone: "SquareParking", couleur: "#64748b" },
  { code: "PUBLICITE", nom: "Publicité / annonces", icone: "Megaphone", couleur: "#16a34a" },
  { code: "ENCHERES", nom: "Frais d'enchères", icone: "Gavel", couleur: "#9333ea" },
  { code: "CARBURANT", nom: "Carburant", icone: "Fuel", couleur: "#b45309" },
  { code: "AMENDE", nom: "Amende non refacturée", icone: "BadgeAlert", couleur: "#be123c" },
  { code: "AUTRE", nom: "Autre", icone: "Ellipsis", couleur: "#78716c" },
];

export const OPTIONS_LOCATION = [
  { libelle: "Conducteur additionnel", modeTarif: "PAR_JOUR", prixCentimes: 500, plafondCentimes: 5000 },
  { libelle: "Siège bébé / rehausseur", modeTarif: "PAR_JOUR", prixCentimes: 400, plafondCentimes: 4000 },
  { libelle: "GPS", modeTarif: "PAR_JOUR", prixCentimes: 300, plafondCentimes: 3000 },
  { libelle: "Kilométrage illimité", modeTarif: "PAR_JOUR", prixCentimes: 1000, plafondCentimes: null },
  { libelle: "Frais de dossier", modeTarif: "FORFAIT", prixCentimes: 2000, plafondCentimes: null },
] as const;

export const ELEMENTS_CHECKLIST = [
  { libelle: "Clés", avecQuantite: true, electriqueUniquement: false },
  { libelle: "Carte grise (original ou copie)", avecQuantite: false, electriqueUniquement: false },
  { libelle: "Attestation d'assurance", avecQuantite: false, electriqueUniquement: false },
  { libelle: "Roue de secours / kit anti-crevaison", avecQuantite: false, electriqueUniquement: false },
  { libelle: "Cric", avecQuantite: false, electriqueUniquement: false },
  { libelle: "Triangle de signalisation", avecQuantite: false, electriqueUniquement: false },
  { libelle: "Gilet jaune", avecQuantite: true, electriqueUniquement: false },
  { libelle: "Câble de recharge", avecQuantite: true, electriqueUniquement: true },
  { libelle: "Tapis de sol", avecQuantite: true, electriqueUniquement: false },
  { libelle: "Constat amiable", avecQuantite: false, electriqueUniquement: false },
];

export const MENTION_FACTURE_DEFAUT =
  "Facture établie sans TVA. [Mention légale à compléter selon votre statut — à faire valider par votre comptable.]";

export const CONDITIONS_GENERALES_DEFAUT = `CONDITIONS GÉNÉRALES DE LOCATION
(Modèle à adapter et à faire valider — modifiable dans Réglages > Documents)

1. Conducteur
Le véhicule ne peut être conduit que par le locataire et les conducteurs additionnels mentionnés au contrat, titulaires d'un permis de conduire valide.

2. Durée et restitution
Le véhicule doit être restitué à la date, à l'heure et au lieu prévus au contrat. Toute journée de 24 heures entamée au-delà de la tolérance prévue est due.

3. Kilométrage
Le kilométrage inclus figure au contrat. Chaque kilomètre supplémentaire est facturé au tarif indiqué.

4. Carburant / recharge
Le véhicule est remis avec le niveau de carburant ou de charge indiqué à l'état des lieux de départ et doit être restitué au même niveau. À défaut, le complément est facturé.

5. État du véhicule
Un état des lieux contradictoire est réalisé au départ et au retour. Tout dommage nouveau constaté au retour est à la charge du locataire, dans la limite de la franchise prévue au contrat.

6. Caution
Une caution est demandée au départ. Elle est restituée après le retour du véhicule, déduction faite des sommes restant dues (dommages, carburant, kilomètres supplémentaires, nettoyage, retard, amendes).

7. Amendes et infractions
Le locataire est responsable des infractions commises pendant la durée de la location. Ses coordonnées pourront être transmises aux autorités (désignation du conducteur).

8. Interdictions
Il est interdit de fumer dans le véhicule, de le sous-louer, de l'utiliser pour des compétitions ou de sortir du territoire sans accord écrit préalable.

9. Sinistre
Tout accident, vol ou dommage doit être signalé sans délai au loueur, avec un constat amiable rempli le cas échéant.`;
