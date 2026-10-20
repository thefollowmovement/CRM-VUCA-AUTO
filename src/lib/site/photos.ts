// Adresses des photos publiques (route /photos/[id]/[largeur], servie en Phase S3 :
// recadrage 4:3, WebP/AVIF, sans métadonnées EXIF/GPS).

export const LARGEURS_PHOTO = [400, 640, 960, 1280, 1600] as const;
export type LargeurPhoto = (typeof LARGEURS_PHOTO)[number];

export type SourcePhoto = { src: string; srcSet?: string };

/** Largeur autorisée la plus proche (au-dessus) : le serveur ne produit que ces tailles. */
export function largeurAutorisee(largeur: number): LargeurPhoto {
  return LARGEURS_PHOTO.find((l) => l >= largeur) ?? 1600;
}

export function urlPhoto(id: string, largeur: number = 960): string {
  return `/photos/${encodeURIComponent(id)}/${largeurAutorisee(largeur)}`;
}

/** src + srcSet pour <img> (le navigateur choisit la taille selon l'écran). */
export function sourcePhoto(id: string, largeurDefaut = 960): SourcePhoto {
  return { src: urlPhoto(id, largeurDefaut), srcSet: LARGEURS_PHOTO.map((l) => `${urlPhoto(id, l)} ${l}w`).join(", ") };
}
