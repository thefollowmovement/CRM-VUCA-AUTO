// Règle unique : quand une annonce (et donc sa page et ses photos) est-elle visible sur le site ?
import type { Prisma } from "@/generated/prisma/client";
import { STATUTS_PUBLIABLES } from "./annonces";

/**
 * Visible si :
 *  - publiée et véhicule En vente / Réservé, non archivé ;
 *  - OU véhicule vendu dont l'annonce a déjà été publiée (page conservée avec le bandeau « vendu »).
 */
export const OU_ANNONCE_VISIBLE: Prisma.AnnonceWhereInput = {
  OR: [
    { publiee: true, vehicule: { statut: { in: [...STATUTS_PUBLIABLES] }, archiveLe: null } },
    { publieeLe: { not: null }, vehicule: { statut: "VENDU", archiveLe: null } },
  ],
};

/** Même règle, pour une annonce déjà chargée. */
export function annonceVisible(a: { publiee: boolean; publieeLe: Date | null }, v: { statut: string; archiveLe: Date | null }): boolean {
  if (v.archiveLe) return false;
  if (a.publiee && (STATUTS_PUBLIABLES as readonly string[]).includes(v.statut)) return true;
  return v.statut === "VENDU" && a.publieeLe !== null;
}
