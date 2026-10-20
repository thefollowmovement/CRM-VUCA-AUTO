// =====================================================================
//  Lectures du site public : SEULE source de données des pages de app/(site).
//  Chaque fonction sélectionne une liste blanche de champs et renvoie des
//  objets construits ici (jamais un modèle Prisma complet).
// =====================================================================
import { db } from "@/lib/db";

/** Coordonnées publiques de l'entreprise (page provisoire, pied de page). */
export async function coordonneesPubliques() {
  const [crm, site] = await Promise.all([
    db.reglages.findUnique({ where: { id: 1 }, select: { societeNom: true, societeTelephone: true, societeEmail: true, societeSiret: true } }),
    db.reglagesSite.findUnique({ where: { id: 1 }, select: { nomAffiche: true, telephone: true, email: true, siret: true } }),
  ]);
  return {
    nom: site?.nomAffiche || crm?.societeNom || "VUCA AUTO",
    telephone: site?.telephone?.trim() || crm?.societeTelephone?.trim() || null,
    email: site?.email?.trim() || crm?.societeEmail?.trim() || null,
    siret: site?.siret?.trim() || crm?.societeSiret?.trim() || null,
  };
}
