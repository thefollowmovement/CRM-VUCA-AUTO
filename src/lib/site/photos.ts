// Adresses des photos publiques : /photos/[id]/[largeur]?v=… (route du site :
// recadrage 4:3, WebP/AVIF, sans métadonnées EXIF/GPS). Le paramètre v change quand
// le recadrage change : le navigateur peut garder la photo en cache un an.

export const LARGEURS_PHOTO = [400, 640, 960, 1280, 1600] as const;
export type LargeurPhoto = (typeof LARGEURS_PHOTO)[number];

export type SourcePhoto = { src: string; srcSet?: string };
export type PhotoPublique = { id: string; v?: string };

/** Largeur autorisée la plus proche (au-dessus) : le serveur ne produit que ces tailles. */
export function largeurAutorisee(largeur: number): LargeurPhoto {
  return LARGEURS_PHOTO.find((l) => l >= largeur) ?? 1600;
}

export function estLargeurAutorisee(valeur: string): LargeurPhoto | null {
  const n = Number(valeur);
  return (LARGEURS_PHOTO as readonly number[]).includes(n) ? (n as LargeurPhoto) : null;
}

/** Empreinte courte d'un recadrage (ou « 0 » sans recadrage) : sert de version d'URL. */
export function versionRecadrage(recadrage: unknown): string {
  if (!recadrage || typeof recadrage !== "object") return "0";
  const texte = JSON.stringify(recadrage);
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** `prefixe` : « /photos » sur le site, « /apercu-site/photos » dans l'aperçu (voir chemins.ts). */
export function urlPhoto(photo: PhotoPublique, largeur: number = 960, prefixe = "/photos"): string {
  return `${prefixe}/${encodeURIComponent(photo.id)}/${largeurAutorisee(largeur)}${photo.v ? `?v=${encodeURIComponent(photo.v)}` : ""}`;
}

/** src + srcSet pour <img> (le navigateur choisit la taille selon l'écran). */
export function sourcePhoto(photo: PhotoPublique, prefixe = "/photos", largeurDefaut = 960, largeurMax = 1600): SourcePhoto {
  return {
    src: urlPhoto(photo, largeurDefaut, prefixe),
    srcSet: LARGEURS_PHOTO.filter((l) => l <= largeurMax).map((l) => `${urlPhoto(photo, l, prefixe)} ${l}w`).join(", "),
  };
}
