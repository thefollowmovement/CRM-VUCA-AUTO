// Mise à jour immédiate du site public après une modification dans le CRM.
import { revalidatePath } from "next/cache";

/** Revalide les pages publiques concernées (toutes si aucun slug n'est donné). */
export function revaliderSite(slug?: string | null) {
  revalidatePath("/site-accueil");
  revalidatePath("/voitures");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/voitures/${slug}`);
  else revalidatePath("/", "layout"); // réglages généraux : tout le site (logo, contact, pied de page…)
}
