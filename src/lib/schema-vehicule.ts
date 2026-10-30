// Schéma du véhicule pour les états des lieux : vues, zones cliquables
// (formes SVG simples) et libellés des dommages. Données pures.

export type Vue = "DESSUS" | "AVANT" | "ARRIERE" | "COTE_GAUCHE" | "COTE_DROIT" | "INTERIEUR";
export type TypeDommage = "RAYURE" | "BOSSE" | "IMPACT" | "ECLAT" | "JANTE_ABIMEE" | "VITRE" | "INTERIEUR" | "AUTRE";
export type Gravite = "LEGER" | "MOYEN" | "IMPORTANT";

export const LIBELLES_VUE: Record<Vue, string> = {
  COTE_GAUCHE: "Côté gauche",
  COTE_DROIT: "Côté droit",
  AVANT: "Avant",
  ARRIERE: "Arrière",
  DESSUS: "Dessus",
  INTERIEUR: "Intérieur",
};
export const VUES: Vue[] = ["COTE_GAUCHE", "AVANT", "COTE_DROIT", "ARRIERE", "DESSUS", "INTERIEUR"];

export const TYPES_DOMMAGE: TypeDommage[] = ["RAYURE", "BOSSE", "IMPACT", "ECLAT", "JANTE_ABIMEE", "VITRE", "INTERIEUR", "AUTRE"];
export const LIBELLES_TYPE_DOMMAGE: Record<TypeDommage, string> = {
  RAYURE: "Rayure",
  BOSSE: "Bosse",
  IMPACT: "Impact",
  ECLAT: "Éclat",
  JANTE_ABIMEE: "Jante abîmée",
  VITRE: "Vitre",
  INTERIEUR: "Intérieur",
  AUTRE: "Autre",
};
export const GRAVITES: Gravite[] = ["LEGER", "MOYEN", "IMPORTANT"];
export const LIBELLES_GRAVITE: Record<Gravite, string> = { LEGER: "Léger", MOYEN: "Moyen", IMPORTANT: "Important" };
export const COULEURS_GRAVITE: Record<Gravite, string> = { LEGER: "#f59e0b", MOYEN: "#f97316", IMPORTANT: "#dc2626" };

export type Zone = { id: string; libelle: string; forme: { rect: [number, number, number, number, number?] } | { poly: [number, number][] } | { cercle: [number, number, number] } };
export type DefinitionVue = { largeur: number; hauteur: number; silhouette: string; zones: Zone[] };

const r = (x: number, y: number, l: number, h: number, arrondi = 6) => ({ rect: [x, y, l, h, arrondi] as [number, number, number, number, number] });

// --- Côté : véhicule vu de profil, avant à gauche (côté gauche) ---
const COTE_L = 420;
const zonesCote = (suffixe: "g" | "d", nom: "gauche" | "droit"): Zone[] => [
  { id: `vitres_${suffixe}`, libelle: `Vitres côté ${nom}`, forme: { poly: [[125, 32], [295, 32], [338, 76], [92, 76]] } },
  { id: `aile_av_${suffixe}`, libelle: `Aile avant ${nom === "gauche" ? "gauche" : "droite"}`, forme: r(18, 76, 92, 64) },
  { id: `porte_av_${suffixe}`, libelle: `Porte avant ${nom === "gauche" ? "gauche" : "droite"}`, forme: r(110, 76, 108, 64, 2) },
  { id: `porte_ar_${suffixe}`, libelle: `Porte arrière ${nom === "gauche" ? "gauche" : "droite"}`, forme: r(218, 76, 104, 64, 2) },
  { id: `aile_ar_${suffixe}`, libelle: `Aile arrière ${nom === "gauche" ? "gauche" : "droite"}`, forme: r(322, 76, 80, 64) },
  { id: `bas_caisse_${suffixe}`, libelle: `Bas de caisse ${nom}`, forme: r(104, 140, 212, 16, 3) },
  { id: `jante_av_${suffixe}`, libelle: `Jante avant ${nom === "gauche" ? "gauche" : "droite"}`, forme: { cercle: [72, 156, 26] } },
  { id: `jante_ar_${suffixe}`, libelle: `Jante arrière ${nom === "gauche" ? "gauche" : "droite"}`, forme: { cercle: [348, 156, 26] } },
];
const SILHOUETTE_COTE = "M18 140 L18 92 Q20 78 40 74 L92 70 L128 28 L292 28 L344 72 L392 80 Q404 84 404 100 L404 140 Z";

/** Miroir horizontal (côté droit : avant à droite). */
function miroir(zones: Zone[], largeur: number): Zone[] {
  return zones.map((z) => {
    const f = z.forme;
    if ("rect" in f) {
      const [x, y, l, h, a] = f.rect;
      return { ...z, forme: { rect: [largeur - x - l, y, l, h, a] } };
    }
    if ("cercle" in f) return { ...z, forme: { cercle: [largeur - f.cercle[0], f.cercle[1], f.cercle[2]] } };
    return { ...z, forme: { poly: f.poly.map(([x, y]) => [largeur - x, y] as [number, number]) } };
  });
}
const miroirChemin = (d: string, largeur: number) =>
  d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${largeur - Number(x)} ${y}`);

export const SCHEMA: Record<Vue, DefinitionVue> = {
  COTE_GAUCHE: { largeur: COTE_L, hauteur: 190, silhouette: SILHOUETTE_COTE, zones: zonesCote("g", "gauche") },
  COTE_DROIT: { largeur: COTE_L, hauteur: 190, silhouette: miroirChemin(SILHOUETTE_COTE, COTE_L), zones: miroir(zonesCote("d", "droit"), COTE_L) },
  AVANT: {
    largeur: 300,
    hauteur: 190,
    silhouette: "M30 178 L30 112 Q32 76 60 70 L80 22 L220 22 L240 70 Q268 76 270 112 L270 178 Z",
    zones: [
      { id: "pare_brise", libelle: "Pare-brise", forme: { poly: [[82, 24], [218, 24], [238, 68], [62, 68]] } },
      { id: "capot", libelle: "Capot", forme: r(42, 70, 216, 40, 8) },
      // Vu de face, la gauche du véhicule est à droite de l'écran
      { id: "phare_d", libelle: "Phare avant droit", forme: r(36, 110, 62, 26) },
      { id: "calandre", libelle: "Calandre", forme: r(98, 110, 104, 26, 3) },
      { id: "phare_g", libelle: "Phare avant gauche", forme: r(202, 110, 62, 26) },
      { id: "pare_choc_av", libelle: "Pare-chocs avant", forme: r(30, 136, 240, 42, 10) },
    ],
  },
  ARRIERE: {
    largeur: 300,
    hauteur: 190,
    silhouette: "M30 178 L30 112 Q32 76 60 70 L84 26 L216 26 L240 70 Q268 76 270 112 L270 178 Z",
    zones: [
      { id: "lunette", libelle: "Lunette arrière", forme: { poly: [[86, 28], [214, 28], [236, 68], [64, 68]] } },
      { id: "hayon", libelle: "Hayon / coffre", forme: r(42, 70, 216, 48, 8) },
      { id: "feu_g", libelle: "Feu arrière gauche", forme: r(36, 118, 62, 22) },
      { id: "plaque", libelle: "Zone de plaque", forme: r(98, 118, 104, 22, 3) },
      { id: "feu_d", libelle: "Feu arrière droit", forme: r(202, 118, 62, 22) },
      { id: "pare_choc_ar", libelle: "Pare-chocs arrière", forme: r(30, 140, 240, 38, 10) },
    ],
  },
  DESSUS: {
    largeur: 200,
    hauteur: 420,
    silhouette: "M30 60 Q30 10 100 10 Q170 10 170 60 L170 360 Q170 410 100 410 Q30 410 30 360 Z",
    zones: [
      { id: "pare_choc_av_dessus", libelle: "Pare-chocs avant", forme: r(44, 12, 112, 26, 12) },
      { id: "capot_dessus", libelle: "Capot", forme: r(48, 38, 104, 72, 4) },
      { id: "pare_brise_dessus", libelle: "Pare-brise", forme: r(50, 110, 100, 40, 4) },
      { id: "toit", libelle: "Toit", forme: r(50, 150, 100, 120, 4) },
      { id: "lunette_dessus", libelle: "Lunette arrière", forme: r(50, 270, 100, 34, 4) },
      { id: "coffre_dessus", libelle: "Coffre", forme: r(48, 304, 104, 76, 4) },
      { id: "pare_choc_ar_dessus", libelle: "Pare-chocs arrière", forme: r(44, 380, 112, 28, 12) },
      { id: "retro_g", libelle: "Rétroviseur gauche", forme: r(12, 132, 18, 14, 4) },
      { id: "retro_d", libelle: "Rétroviseur droit", forme: r(170, 132, 18, 14, 4) },
      { id: "flanc_g", libelle: "Flanc gauche", forme: r(30, 60, 18, 300, 4) },
      { id: "flanc_d", libelle: "Flanc droit", forme: r(152, 60, 18, 300, 4) },
    ],
  },
  INTERIEUR: {
    largeur: 200,
    hauteur: 320,
    silhouette: "M30 40 Q30 12 100 12 Q170 12 170 40 L170 290 Q170 308 150 308 L50 308 Q30 308 30 290 Z",
    zones: [
      { id: "tableau_bord", libelle: "Tableau de bord", forme: r(38, 22, 124, 40, 8) },
      { id: "siege_conducteur", libelle: "Siège conducteur", forme: r(44, 78, 50, 72, 10) },
      { id: "siege_passager", libelle: "Siège passager", forme: r(106, 78, 50, 72, 10) },
      { id: "console", libelle: "Console centrale", forme: r(94, 82, 12, 64, 3) },
      { id: "banquette", libelle: "Banquette arrière", forme: r(40, 168, 120, 62, 10) },
      { id: "coffre_interieur", libelle: "Coffre (intérieur)", forme: r(40, 244, 120, 56, 6) },
    ],
  },
};

/** Libellé d'une zone (toutes vues confondues). */
export function libelleZone(vue: Vue, zone: string): string {
  return SCHEMA[vue]?.zones.find((z) => z.id === zone)?.libelle ?? zone;
}

/** « Rayure — porte avant gauche » */
export function libelleDommage(d: { type: TypeDommage; vue: Vue; zone: string }): string {
  return `${LIBELLES_TYPE_DOMMAGE[d.type]} — ${libelleZone(d.vue, d.zone).toLowerCase()}`;
}
