// Traitement des images côté serveur (sharp) : orientation, taille,
// suppression des métadonnées (dont la position GPS des photos de téléphone).
import sharp from "sharp";

export const TAILLE_MAX_PHOTO = 1600;
export const TAILLE_MINIATURE = 480;

/** Redresse, réduit à 1600 px max et réencode en JPEG (métadonnées supprimées). */
export async function optimiserPhoto(contenu: Buffer) {
  const image = sharp(contenu, { failOn: "error" }).rotate();
  const { data, info } = await image
    .resize(TAILLE_MAX_PHOTO, TAILLE_MAX_PHOTO, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { contenu: data, largeur: info.width, hauteur: info.height };
}

/** Miniature JPEG (480 px max) pour les listes et galeries. */
export async function creerMiniature(contenu: Buffer) {
  return sharp(contenu)
    .rotate()
    .resize(TAILLE_MINIATURE, TAILLE_MINIATURE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}

/**
 * Type réel d'un fichier d'après ses premiers octets (on ne se fie pas au
 * type annoncé par le navigateur).
 */
export function detecterType(contenu: Buffer): string | null {
  const debut = contenu.subarray(0, 12);
  if (debut[0] === 0xff && debut[1] === 0xd8 && debut[2] === 0xff) return "image/jpeg";
  if (debut.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (debut.subarray(0, 4).toString("ascii") === "RIFF" && debut.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (debut.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  const marque = debut.subarray(4, 12).toString("ascii");
  if (/^ftyp(heic|heix|hevc|mif1|msf1)/.test(marque)) return "image/heic";
  return null;
}
