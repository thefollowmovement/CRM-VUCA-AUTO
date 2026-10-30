// =====================================================================
//  Photos du site public (route /photos/[id]/[largeur]).
//  Seules sont servies : les photos cochées « publiques » d'une annonce visible,
//  et les images du site (logos, favicon, photos « à propos », vendeur, partage).
//  Recadrage 4:3, largeur limitée, WebP/AVIF selon le navigateur, AUCUNE
//  métadonnée (EXIF, GPS). Résultat mis en cache dans le stockage.
// =====================================================================
import sharp, { type Sharp } from "sharp";
import { db } from "@/lib/db";
import { versionRecadrage, type LargeurPhoto } from "@/lib/site/photos";
import { zoneEnPixels, type Recadrage } from "@/lib/site/recadrage";
import { stockage } from "@/lib/storage";
import { CHAMPS_IMAGES_SITE } from "./reglages";
import { annonceVisible } from "./visibilite";

export type FormatPhoto = "avif" | "webp" | "jpeg" | "png";
const TYPES: Record<FormatPhoto, string> = { avif: "image/avif", webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };

/** Meilleur format accepté par le navigateur (en-tête Accept). */
export function choisirFormat(accept: string | null, transparence: boolean): FormatPhoto {
  const a = accept ?? "";
  if (a.includes("image/avif")) return "avif";
  if (a.includes("image/webp")) return "webp";
  return transparence ? "png" : "jpeg";
}

function encoder(image: Sharp, format: FormatPhoto) {
  // sharp n'écrit aucune métadonnée par défaut (pas de withMetadata) : EXIF et GPS disparaissent
  switch (format) {
    case "avif":
      return image.avif({ quality: 55, effort: 3 });
    case "webp":
      return image.webp({ quality: 78 });
    case "png":
      return image.png({ compressionLevel: 9 });
    default:
      return image.jpeg({ quality: 80, mozjpeg: true });
  }
}

export async function photoPublique(id: string, largeur: LargeurPhoto, accept: string | null): Promise<{ contenu: Buffer; type: string } | null> {
  const f = await db.fichier.findUnique({
    where: { id },
    select: {
      id: true, categorie: true, cleStockage: true, typeMime: true, publique: true, recadrage: true,
      vehicule: { select: { statut: true, archiveLe: true, annonce: { select: { publiee: true, publieeLe: true } } } },
    },
  });
  if (!f || !f.typeMime.startsWith("image/")) return null;

  let photoVehicule: boolean;
  if (f.categorie === "PHOTO_VEHICULE") {
    if (!f.publique || !f.vehicule?.annonce || !annonceVisible(f.vehicule.annonce, f.vehicule)) return null;
    photoVehicule = true;
  } else if (f.categorie === "IMAGE_SITE") {
    // L'image doit être celle actuellement choisie dans les réglages du site
    const r = await db.reglagesSite.findUnique({ where: { id: 1 }, select: Object.fromEntries(CHAMPS_IMAGES_SITE.map((c) => [c, true])) as Record<(typeof CHAMPS_IMAGES_SITE)[number], true> });
    if (!r || !CHAMPS_IMAGES_SITE.some((c) => r[c] === id)) return null;
    photoVehicule = false;
  } else {
    return null; // justificatifs, cartes grises, signatures… jamais
  }

  const transparence = !photoVehicule && f.typeMime !== "image/jpeg";
  const format = choisirFormat(accept, transparence);
  const version = photoVehicule ? versionRecadrage(f.recadrage) : "0";
  const cleCache = `site-public/${f.id}-${largeur}-${version}.${format}`;
  try {
    return { contenu: await stockage.lire(cleCache), type: TYPES[format] };
  } catch {
    // pas encore en cache : on la produit
  }

  const original = await stockage.lire(f.cleStockage);
  let image = sharp(original, { failOn: "error" }).rotate();
  if (photoVehicule) {
    const meta = await sharp(original).metadata();
    const [w, h] = (meta.orientation ?? 1) >= 5 ? [meta.height!, meta.width!] : [meta.width!, meta.height!];
    image = image.extract(zoneEnPixels(w, h, (f.recadrage as Recadrage | null) ?? null)).resize(largeur, Math.round((largeur * 3) / 4), { fit: "cover", withoutEnlargement: true });
  } else {
    image = image.resize(largeur, largeur, { fit: "inside", withoutEnlargement: true });
  }
  const contenu = await encoder(image, format).toBuffer();
  await stockage.enregistrer(cleCache, contenu).catch(() => undefined);
  return { contenu, type: TYPES[format] };
}
