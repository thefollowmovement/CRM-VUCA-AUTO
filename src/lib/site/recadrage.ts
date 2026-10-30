// Recadrage 4:3 des photos publiques. Le recadrage est stocké en % de l'image :
//   x, y = coin haut-gauche (% de la largeur / hauteur), l = largeur du cadre (% de la largeur).
// La hauteur du cadre se déduit du format 4:3. Sans recadrage : le plus grand cadre centré.

export type Recadrage = { x: number; y: number; l: number };
export type Zone = { left: number; top: number; width: number; height: number };

/** Largeur maximale du cadre (en %) pour qu'il tienne en hauteur. */
export function largeurMaxCadre(largeur: number, hauteur: number): number {
  return Math.min(100, ((hauteur * 4) / 3 / largeur) * 100);
}

/** Cadre corrigé pour rester dans l'image. */
export function borner(r: Recadrage, largeur: number, hauteur: number): Recadrage {
  const l = Math.max(10, Math.min(r.l, largeurMaxCadre(largeur, hauteur)));
  const hPourcent = ((l / 100) * largeur * 3) / 4 / hauteur * 100;
  return { l, x: Math.max(0, Math.min(r.x, 100 - l)), y: Math.max(0, Math.min(r.y, 100 - hPourcent)) };
}

/** Cadre par défaut : le plus grand possible, centré. */
export function recadrageParDefaut(largeur: number, hauteur: number): Recadrage {
  const l = largeurMaxCadre(largeur, hauteur);
  const hPourcent = ((l / 100) * largeur * 3) / 4 / hauteur * 100;
  return { x: (100 - l) / 2, y: (100 - hPourcent) / 2, l };
}

/** Zone en pixels à extraire de l'image (pour sharp.extract). */
export function zoneEnPixels(largeur: number, hauteur: number, r: Recadrage | null): Zone {
  const b = borner(r ?? recadrageParDefaut(largeur, hauteur), largeur, hauteur);
  const width = Math.max(1, Math.round((b.l / 100) * largeur));
  const height = Math.max(1, Math.min(hauteur, Math.round((width * 3) / 4)));
  const left = Math.min(largeur - width, Math.round((b.x / 100) * largeur));
  const top = Math.min(hauteur - height, Math.round((b.y / 100) * hauteur));
  return { left: Math.max(0, left), top: Math.max(0, top), width, height };
}
