// Réglages du site public (ligne unique, créée au premier accès).
import { db } from "@/lib/db";
import { ENGAGEMENTS_PROPOSES, HORAIRES_VIDES } from "@/lib/site/reglages-defaut";

export async function lireReglagesSite() {
  return db.reglagesSite.upsert({
    where: { id: 1 },
    create: { id: 1, engagements: ENGAGEMENTS_PROPOSES, horaires: HORAIRES_VIDES },
    update: {},
  });
}
export type ReglagesSiteComplets = Awaited<ReturnType<typeof lireReglagesSite>>;

/** Images du site (logos, favicon, photos) : champs de ReglagesSite qui pointent vers un Fichier IMAGE_SITE. */
export const CHAMPS_IMAGES_SITE = ["logoClairId", "logoFonceId", "faviconId", "vendeurPhotoId", "aProposPhotoId", "imagePartageId"] as const;
export type ChampImageSite = (typeof CHAMPS_IMAGES_SITE)[number];
