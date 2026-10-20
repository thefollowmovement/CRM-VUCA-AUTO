// Annonces côté CRM (hors Server Actions : fonctions appelées par les pages et les actions).
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { creerSlug, referenceAnnonce, titreParDefaut } from "@/lib/site/slug";
import { revaliderSite } from "@/server/site/revalidation";

type Client = Prisma.TransactionClient | typeof db;

/** Statuts qui autorisent la publication sur le site. */
export const STATUTS_PUBLIABLES = ["EN_VENTE", "RESERVE"] as const;
export const estPubliable = (statut: string) => (STATUTS_PUBLIABLES as readonly string[]).includes(statut);

/** Annonce du véhicule, créée à la première ouverture de l'onglet (titre et prix préremplis). */
export async function annoncePourVehicule(vehiculeId: string) {
  const existante = await db.annonce.findUnique({ where: { vehiculeId } });
  if (existante) return existante;
  const v = await db.vehicule.findUnique({ where: { id: vehiculeId }, select: { id: true, marque: true, modele: true, version: true, annee: true, prixCibleCentimes: true } });
  if (!v) return null;
  return db.$transaction(async (tx) => {
    const c = await tx.compteur.upsert({ where: { cle: "annonce" }, create: { cle: "annonce", valeur: 1 }, update: { valeur: { increment: 1 } } });
    return tx.annonce.create({
      data: {
        vehiculeId,
        reference: referenceAnnonce(c.valeur),
        slug: creerSlug(v, v.id),
        titre: titreParDefaut(v),
        prixAfficheCentimes: v.prixCibleCentimes,
      },
    });
  });
}

/**
 * Dépublication automatique : véhicule vendu, archivé ou passé dans un statut hors vente.
 * La page publique d'un véhicule vendu reste consultable (bandeau « vendu »).
 */
export async function depublierSiNecessaire(client: Client, vehiculeId: string, nouveauStatut: string) {
  if (estPubliable(nouveauStatut)) return;
  const a = await client.annonce.findUnique({ where: { vehiculeId }, select: { id: true, publiee: true, slug: true } });
  if (!a?.publiee) return;
  await client.annonce.update({ where: { id: a.id }, data: { publiee: false, depublieeLe: new Date() } });
  revaliderSite(a.slug);
}

/** Toute modification visible de l'annonce met à jour « Annonce mise à jour le … ». */
export async function marquerAnnonceModifiee(client: Client, vehiculeId: string) {
  const a = await client.annonce.update({ where: { vehiculeId }, data: { misAJourLe: new Date() }, select: { slug: true } });
  revaliderSite(a.slug);
}

/** Le véhicule a changé (caractéristiques, statut, photos) : page publique et listes à jour. */
export async function revaliderAnnonceDuVehicule(vehiculeId: string) {
  const a = await db.annonce.findUnique({ where: { vehiculeId }, select: { slug: true, publieeLe: true } });
  if (a?.publieeLe) revaliderSite(a.slug);
}
