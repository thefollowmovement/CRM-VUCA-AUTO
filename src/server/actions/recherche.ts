"use server";

import { db } from "@/lib/db";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { LIBELLES_STATUT, nomVehicule } from "@/lib/vehicule";

export type ResultatRecherche = { libelle: string; detail?: string; href: string };
export type GroupeResultats = { titre: string; resultats: ResultatRecherche[] };

/**
 * Recherche globale. Chaque phase ajoute ses entités :
 * véhicules (Phase 2), clients et contrats (Phase 4)…
 */
export async function rechercheGlobale(requete: string): Promise<GroupeResultats[]> {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return [];
  const q = requete.trim().slice(0, 100);
  if (q.length < 2) return [];

  const groupes: GroupeResultats[] = [];

  const compact = q.replace(/[\s-]/g, "");
  const vehicules = await db.vehicule.findMany({
    where: {
      OR: [
        { immatriculation: { contains: q, mode: "insensitive" } },
        { immatriculation: { contains: compact.replace(/^([A-Z]{2})(\d{3})([A-Z]{2})$/i, "$1-$2-$3"), mode: "insensitive" } },
        { vin: { contains: compact, mode: "insensitive" } },
        { marque: { contains: q, mode: "insensitive" } },
        { modele: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    orderBy: { dateAchat: "desc" },
    select: { id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true },
  });
  if (vehicules.length) {
    groupes.push({
      titre: "Véhicules",
      resultats: vehicules.map((v) => ({
        libelle: nomVehicule(v),
        detail: [v.immatriculation, LIBELLES_STATUT[v.statut]].filter(Boolean).join(" · "),
        href: `/vehicules/${v.id}`,
      })),
    });
  }

  const partenaires = await db.partenaire.findMany({
    where: {
      OR: [
        { nom: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { telephone: { contains: q } },
      ],
    },
    take: 8,
    orderBy: { nom: "asc" },
  });
  if (partenaires.length) {
    groupes.push({
      titre: "Partenaires",
      resultats: partenaires.map((p) => ({
        libelle: p.nom,
        detail: [p.type === "SOCIETE" ? "Société" : "Investisseur", p.telephone, p.email]
          .filter(Boolean)
          .join(" · "),
        href: `/investisseurs/${p.id}`,
      })),
    });
  }

  return groupes;
}
