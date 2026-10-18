"use server";

import { db } from "@/lib/db";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";

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
