"use server";

import { LIBELLES_STATUT_CONTRAT, statutAffiche } from "@/lib/contrat";
import { db } from "@/lib/db";
import { formatDate, formatEuros } from "@/lib/format";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { LIBELLES_STATUT, nomVehicule } from "@/lib/vehicule";

export type ResultatRecherche = { libelle: string; detail?: string; href: string };
export type GroupeResultats = { titre: string; resultats: ResultatRecherche[] };

/**
 * Recherche globale. Chaque phase ajoute ses entités :
 * véhicules (Phase 2), clients et contrats (Phase 4), factures, reçus et PV (Phase 6)…
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

  // Clients (nom, prénom, téléphone, email, n° de permis)
  const mots = q.split(/\s+/).filter(Boolean).slice(0, 3);
  const clients = await db.client.findMany({
    where: {
      anonymiseLe: null,
      AND: mots.map((mot) => ({
        OR: [
          { nom: { contains: mot, mode: "insensitive" as const } },
          { prenom: { contains: mot, mode: "insensitive" as const } },
          { telephone: { contains: mot } },
          { email: { contains: mot, mode: "insensitive" as const } },
          { numeroPermis: { contains: mot, mode: "insensitive" as const } },
        ],
      })),
    },
    take: 8,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: { id: true, nom: true, prenom: true, telephone: true, email: true, listeNoire: true, archiveLe: true },
  });
  if (clients.length) {
    groupes.push({
      titre: "Clients",
      resultats: clients.map((c) => ({
        libelle: [c.prenom, c.nom].filter(Boolean).join(" "),
        detail: [c.listeNoire ? "Liste noire" : null, c.archiveLe ? "Archivé" : null, c.telephone, c.email].filter(Boolean).join(" · "),
        href: `/clients/${c.id}`,
      })),
    });
  }

  // Contrats (numéro LOC-2026-0001, ou « 0001 »)
  const contrats = await db.contratLocation.findMany({
    where: { numero: { contains: q, mode: "insensitive" } },
    take: 8,
    orderBy: { creeLe: "desc" },
    select: { id: true, numero: true, statut: true, retourPrevuLe: true, client: { select: { nom: true, prenom: true } }, vehicule: { select: { immatriculation: true, marque: true, modele: true } } },
  });
  if (contrats.length) {
    groupes.push({
      titre: "Contrats",
      resultats: contrats.map((c) => ({
        libelle: c.numero,
        detail: [[c.client.prenom, c.client.nom].filter(Boolean).join(" "), c.vehicule.immatriculation ?? `${c.vehicule.marque} ${c.vehicule.modele}`, LIBELLES_STATUT_CONTRAT[statutAffiche(c.statut, c.retourPrevuLe)]].join(" · "),
        href: `/location/contrats/${c.id}`,
      })),
    });
  }

  // Factures (FAC-2026-0001) et reçus (REC-2026-0001)
  if (/\d/.test(q)) {
    const [factures, recus, amendes] = await Promise.all([
      db.facture.findMany({
        where: { numero: { contains: q, mode: "insensitive" } },
        take: 6,
        orderBy: { creeLe: "desc" },
        select: { id: true, numero: true, totalCentimes: true, destinataireNom: true, annuleeLe: true, contratId: true, vehiculeId: true },
      }),
      db.paiement.findMany({
        where: { numeroRecu: { contains: q, mode: "insensitive" } },
        take: 6,
        orderBy: { creeLe: "desc" },
        select: { id: true, numeroRecu: true, montantCentimes: true, date: true, contratId: true, contrat: { select: { numero: true } } },
      }),
      db.amende.findMany({
        where: { numeroAvis: { contains: compact, mode: "insensitive" } },
        take: 6,
        orderBy: { infractionLe: "desc" },
        select: { id: true, numeroAvis: true, immatriculationLue: true, montantCentimes: true, infractionLe: true, vehicule: { select: { immatriculation: true } } },
      }),
    ]);
    if (factures.length || recus.length) {
      groupes.push({
        titre: "Factures et reçus",
        resultats: [
          ...factures.map((f) => ({
            libelle: `Facture ${f.numero}`,
            detail: [f.destinataireNom, formatEuros(f.totalCentimes), f.annuleeLe ? "Annulée" : null].filter(Boolean).join(" · "),
            href: f.contratId ? `/location/contrats/${f.contratId}` : `/vehicules/${f.vehiculeId}`,
          })),
          ...recus.map((r) => ({
            libelle: `Reçu ${r.numeroRecu}`,
            detail: [r.contrat.numero, formatDate(r.date), formatEuros(r.montantCentimes)].join(" · "),
            href: `/location/contrats/${r.contratId}`,
          })),
        ],
      });
    }
    if (amendes.length) {
      groupes.push({
        titre: "PV",
        resultats: amendes.map((a) => ({
          libelle: `PV n° ${a.numeroAvis}`,
          detail: [formatDate(a.infractionLe), a.vehicule?.immatriculation ?? a.immatriculationLue, formatEuros(a.montantCentimes)].filter(Boolean).join(" · "),
          href: `/location/amendes/${a.id}`,
        })),
      });
    }
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
