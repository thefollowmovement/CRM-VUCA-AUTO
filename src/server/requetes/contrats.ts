// Lectures des contrats de location, disponibilités et planning.
import type { Prisma } from "@/generated/prisma/client";
import type { StatutContrat } from "@/generated/prisma/enums";
import { tauxOccupation } from "@/lib/calculs/location";
import { STATUTS_ACTIFS, type StatutAffiche } from "@/lib/contrat";
import { db } from "@/lib/db";
import { ajouterJoursParis, debutJourParis, jourISOVersDateParis } from "@/lib/dates";
import { nomVehicule } from "@/lib/vehicule";

// ---------------------------------------------------------------------
//  Véhicules louables
// ---------------------------------------------------------------------

/** Véhicules de location / mixtes, ni vendus ni archivés (immobilisés inclus, pour le planning). */
export async function vehiculesLouables() {
  const vehicules = await db.vehicule.findMany({
    where: { typeExploitation: { in: ["LOCATION", "MIXTE"] }, statut: { notIn: ["VENDU", "ARCHIVE"] } },
    orderBy: [{ marque: "asc" }, { modele: "asc" }],
    select: {
      id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true, typeExploitation: true,
      tarifJournalierCentimes: true, tarifHebdoCentimes: true, tarifMensuelCentimes: true, kmInclusParJour: true, kmInclusParMois: true,
      prixKmSupCentimes: true, cautionDefautCentimes: true, franchiseDefautCentimes: true, kilometrageActuel: true,
      fichiers: { where: { categorie: "PHOTO_VEHICULE", estPrincipale: true }, select: { id: true }, take: 1 },
    },
  });
  return vehicules.map(({ fichiers, ...v }) => ({ ...v, nom: nomVehicule(v), photoId: fichiers[0]?.id ?? null }));
}
export type VehiculeLouable = Awaited<ReturnType<typeof vehiculesLouables>>[number];

/** Contrats actifs qui chevauchent la période, par véhicule (contrôle de disponibilité). */
export async function conflits(depart: Date, retour: Date, sauf?: string, vehiculeId?: string) {
  return db.contratLocation.findMany({
    where: {
      id: sauf ? { not: sauf } : undefined,
      vehiculeId,
      archiveLe: null,
      statut: { in: STATUTS_ACTIFS },
      departPrevuLe: { lt: retour },
      retourPrevuLe: { gt: depart },
    },
    select: { id: true, numero: true, vehiculeId: true, departPrevuLe: true, retourPrevuLe: true, client: { select: { nom: true, prenom: true } } },
    orderBy: { departPrevuLe: "asc" },
  });
}

// ---------------------------------------------------------------------
//  Liste et fiche
// ---------------------------------------------------------------------

export type FiltresContrats = { statut?: StatutAffiche; vehicule?: string; client?: string; du?: string; au?: string; q?: string; archives?: boolean };
const STATUTS: StatutAffiche[] = ["RESERVATION", "CONFIRMEE", "EN_COURS", "EN_RETARD", "TERMINEE", "ANNULEE"];

export function lireFiltresContrats(p: Record<string, string | string[] | undefined>): FiltresContrats {
  const un = (k: string) => {
    const v = p[k];
    return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || undefined;
  };
  const statut = un("statut");
  return {
    statut: statut && (STATUTS as string[]).includes(statut) ? (statut as StatutAffiche) : undefined,
    vehicule: un("vehicule"),
    client: un("client"),
    du: un("du"),
    au: un("au"),
    q: un("q"),
    archives: un("archives") === "1",
  };
}

export async function listerContrats(f: FiltresContrats) {
  const maintenant = new Date();
  const et: Prisma.ContratLocationWhereInput[] = [{ archiveLe: f.archives ? { not: null } : null }];
  if (f.statut === "EN_RETARD") et.push({ statut: "EN_COURS", retourPrevuLe: { lt: maintenant } });
  else if (f.statut) et.push({ statut: f.statut as StatutContrat });
  if (f.vehicule) et.push({ vehiculeId: f.vehicule });
  if (f.client) et.push({ OR: [{ clientId: f.client }, { conducteursAdditionnels: { some: { clientId: f.client } } }] });
  // Période : contrats qui touchent la période
  const du = f.du ? jourISOVersDateParis(f.du) : null;
  const au = f.au ? jourISOVersDateParis(f.au) : null;
  if (du) et.push({ retourPrevuLe: { gte: du } });
  if (au) et.push({ departPrevuLe: { lt: ajouterJoursParis(au, 1) } });
  if (f.q) {
    et.push({
      OR: [
        { numero: { contains: f.q, mode: "insensitive" } },
        { client: { nom: { contains: f.q, mode: "insensitive" } } },
        { client: { prenom: { contains: f.q, mode: "insensitive" } } },
        { vehicule: { immatriculation: { contains: f.q, mode: "insensitive" } } },
      ],
    });
  }
  return db.contratLocation.findMany({
    where: { AND: et },
    orderBy: { departPrevuLe: "desc" },
    take: 300,
    select: {
      id: true, numero: true, statut: true, type: true, departPrevuLe: true, retourPrevuLe: true, prixTotalCentimes: true,
      client: { select: { id: true, nom: true, prenom: true } },
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
    },
  });
}

export async function obtenirContrat(id: string) {
  return db.contratLocation.findUnique({
    where: { id },
    include: {
      client: true,
      vehicule: {
        select: {
          id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true, kilometrageActuel: true,
          fichiers: { where: { categorie: "PHOTO_VEHICULE", estPrincipale: true }, select: { id: true }, take: 1 },
        },
      },
      conducteursAdditionnels: { include: { client: { select: { id: true, nom: true, prenom: true, telephone: true, numeroPermis: true } } } },
      options: { orderBy: { libelle: "asc" } },
      paiements: { select: { montantCentimes: true, nature: true } },
    },
  });
}

// ---------------------------------------------------------------------
//  Planning et vue « Aujourd'hui »
// ---------------------------------------------------------------------

/** Contrats (hors annulés et archivés) qui touchent la période. */
export async function contratsPlanning(debut: Date, fin: Date, vehiculeId?: string) {
  return db.contratLocation.findMany({
    where: {
      vehiculeId,
      archiveLe: null,
      statut: { not: "ANNULEE" },
      departPrevuLe: { lt: fin },
      // Une location en cours non rendue (en retard) reste affichée jusqu'à aujourd'hui
      OR: [{ retourPrevuLe: { gt: debut } }, { statut: "EN_COURS" }, { retourReelLe: { gt: debut } }],
    },
    orderBy: { departPrevuLe: "asc" },
    select: {
      id: true, numero: true, statut: true, vehiculeId: true, departPrevuLe: true, retourPrevuLe: true, departReelLe: true, retourReelLe: true,
      client: { select: { nom: true, prenom: true } },
    },
  });
}
export type ContratPlanning = Awaited<ReturnType<typeof contratsPlanning>>[number];

export async function vueAujourdhui() {
  const maintenant = new Date();
  const debut = debutJourParis(maintenant);
  const apresDemain = ajouterJoursParis(debut, 2);
  const select = {
    id: true, numero: true, statut: true, departPrevuLe: true, retourPrevuLe: true, lieuDepart: true, lieuRetour: true, livraison: true,
    client: { select: { id: true, nom: true, prenom: true, telephone: true } },
    vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
  } satisfies Prisma.ContratLocationSelect;
  const [departs, retours, retards, aConfirmer] = await Promise.all([
    db.contratLocation.findMany({
      where: { archiveLe: null, statut: { in: ["RESERVATION", "CONFIRMEE"] }, departPrevuLe: { lt: apresDemain } },
      orderBy: { departPrevuLe: "asc" },
      select,
    }),
    db.contratLocation.findMany({
      where: { archiveLe: null, statut: "EN_COURS", retourPrevuLe: { gte: maintenant, lt: apresDemain } },
      orderBy: { retourPrevuLe: "asc" },
      select,
    }),
    db.contratLocation.findMany({ where: { archiveLe: null, statut: "EN_COURS", retourPrevuLe: { lt: maintenant } }, orderBy: { retourPrevuLe: "asc" }, select }),
    db.contratLocation.findMany({
      where: { archiveLe: null, statut: "RESERVATION", departPrevuLe: { gte: apresDemain, lt: ajouterJoursParis(debut, 8) } },
      orderBy: { departPrevuLe: "asc" },
      select,
    }),
  ]);
  return { departs, retours, retards, aConfirmer, demain: ajouterJoursParis(debut, 1) };
}

// ---------------------------------------------------------------------
//  Occupation d'un véhicule (onglet Location)
// ---------------------------------------------------------------------

/** Taux d'occupation depuis la mise en location (jours immobilisés exclus), revenus encaissés. */
export async function occupationVehicule(vehiculeId: string) {
  const v = await db.vehicule.findUnique({
    where: { id: vehiculeId },
    select: {
      dateMiseEnLocation: true, dateAchat: true, statut: true,
      historiqueStatuts: { orderBy: { changeLe: "asc" }, select: { nouveauStatut: true, changeLe: true } },
      contrats: { where: { statut: { in: ["EN_COURS", "TERMINEE"] } }, select: { departPrevuLe: true, retourPrevuLe: true, departReelLe: true, retourReelLe: true, statut: true } },
    },
  });
  if (!v) return null;
  const maintenant = new Date();
  const debut = v.dateMiseEnLocation ?? v.dateAchat;

  // Périodes « Immobilisé » reconstituées à partir de l'historique des statuts
  const immobilisations: { debut: Date; fin: Date }[] = [];
  let depuis: Date | null = null;
  for (const h of v.historiqueStatuts) {
    if (h.nouveauStatut === "IMMOBILISE" && !depuis) depuis = h.changeLe;
    else if (h.nouveauStatut !== "IMMOBILISE" && depuis) {
      immobilisations.push({ debut: depuis, fin: h.changeLe });
      depuis = null;
    }
  }
  if (depuis) immobilisations.push({ debut: depuis, fin: maintenant });

  const locations = v.contrats.map((c) => ({
    debut: c.departReelLe ?? c.departPrevuLe,
    // En cours : compté jusqu'à maintenant
    fin: c.retourReelLe ?? (c.statut === "EN_COURS" ? maintenant : c.retourPrevuLe),
  }));
  const taux = tauxOccupation({ debut, fin: maintenant, locations, immobilisations });

  const paiements = await db.paiement.findMany({ where: { contrat: { vehiculeId } }, select: { montantCentimes: true, nature: true } });
  const revenus = paiements.reduce((a, p) => a + (p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes), 0);
  return { ...taux, depuis: debut, revenusCentimes: revenus };
}
