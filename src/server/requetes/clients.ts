// Lectures des clients.
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type FiltreClients = "actifs" | "liste-noire" | "archives";

export function nomClient(c: { civilite?: string | null; nom: string; prenom?: string | null }): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ");
}

export async function listerClients(q: string | undefined, filtre: FiltreClients) {
  const et: Prisma.ClientWhereInput[] = [{ anonymiseLe: filtre === "archives" ? undefined : null }];
  if (filtre === "archives") et.push({ archiveLe: { not: null } });
  else et.push({ archiveLe: null });
  if (filtre === "liste-noire") et.push({ listeNoire: true });
  if (q) {
    const mots = q.split(/\s+/).filter(Boolean).slice(0, 4);
    for (const mot of mots) {
      et.push({
        OR: [
          { nom: { contains: mot, mode: "insensitive" } },
          { prenom: { contains: mot, mode: "insensitive" } },
          { telephone: { contains: mot.replace(/\s/g, "") } },
          { telephone: { contains: mot } },
          { email: { contains: mot, mode: "insensitive" } },
          { numeroPermis: { contains: mot, mode: "insensitive" } },
          { entreprise: { contains: mot, mode: "insensitive" } },
        ],
      });
    }
  }
  return db.client.findMany({
    where: { AND: et },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    take: 300,
    select: {
      id: true, civilite: true, nom: true, prenom: true, telephone: true, email: true, entreprise: true, ville: true,
      listeNoire: true, motifListeNoire: true, numeroPermis: true, dateObtentionPermis: true, dateValiditePermis: true,
      dateValiditePieceIdentite: true, archiveLe: true, anonymiseLe: true,
      _count: { select: { contrats: true } },
    },
  });
}

export async function obtenirClient(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      fichiers: { orderBy: { creeLe: "desc" }, select: { id: true, categorie: true, libelle: true, nomOriginal: true, typeMime: true, tailleOctets: true, creeLe: true } },
      contrats: {
        orderBy: { departPrevuLe: "desc" },
        select: {
          id: true, numero: true, statut: true, type: true, departPrevuLe: true, retourPrevuLe: true, retourReelLe: true, prixTotalCentimes: true, archiveLe: true,
          vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
          paiements: { orderBy: [{ date: "asc" }, { creeLe: "asc" }], select: { id: true, montantCentimes: true, nature: true } },
          fraisSupplementaires: { select: { montantCentimes: true } },
          echeances: { where: { statut: { not: "ANNULEE" } }, orderBy: { numero: "asc" }, select: { id: true, montantCentimes: true, dateEcheance: true } },
        },
      },
      amendes: {
        orderBy: { infractionLe: "desc" },
        select: { id: true, infractionLe: true, montantCentimes: true, statut: true, contrat: { select: { numero: true } } },
      },
      conduitesAdditionnelles: {
        select: { contrat: { select: { id: true, numero: true, statut: true, departPrevuLe: true, retourPrevuLe: true, vehicule: { select: { marque: true, modele: true, immatriculation: true } } } } },
      },
    },
  });
}

/** Clients proposés dans l'assistant de contrat (non archivés, non anonymisés). */
export async function clientsPourContrat() {
  return db.client.findMany({
    where: { archiveLe: null, anonymiseLe: null },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true, nom: true, prenom: true, telephone: true, email: true, listeNoire: true, motifListeNoire: true,
      numeroPermis: true, dateObtentionPermis: true, dateValiditePermis: true, dateValiditePieceIdentite: true,
    },
  });
}
export type ClientChoix = Awaited<ReturnType<typeof clientsPourContrat>>[number];
