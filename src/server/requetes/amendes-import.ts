// Lectures du module Amendes : suivi d'un dépôt, écran « À valider ».
import { raisonFicheClient, type Raison } from "@/lib/calculs/amendes";
import { db } from "@/lib/db";
import { nomVehicule } from "@/lib/vehicule";
import { cleApiConfiguree } from "@/server/amendes/lecture";

export async function etatLot(lotId: string) {
  const lot = await db.lotImportAmendes.findUnique({
    where: { id: lotId },
    include: {
      creePar: { select: { nom: true } },
      amendes: {
        orderBy: [{ creeLe: "asc" }, { fichierPage: "asc" }],
        select: {
          id: true, statut: true, numeroAvis: true, fichierPage: true, immatriculationLue: true, raisonsVerification: true, ocrEnCoursLe: true, doublonDeId: true,
          fichiers: { take: 1, orderBy: { creeLe: "asc" }, select: { id: true, nomOriginal: true } },
        },
      },
    },
  });
  if (!lot) return null;
  const lus = lot.amendes.filter((a) => a.statut !== "A_LIRE").length;
  return { ...lot, lus, total: lot.amendes.length, cleApi: cleApiConfiguree() };
}

export async function derniersLots(n = 5) {
  const lots = await db.lotImportAmendes.findMany({ orderBy: { creeLe: "desc" }, take: n, include: { _count: { select: { amendes: true } }, creePar: { select: { nom: true } } } });
  return lots;
}

export async function compteursAmendes() {
  const groupes = await db.amende.groupBy({ by: ["statut"], _count: { _all: true } });
  const n = (s: string) => groupes.find((g) => g.statut === s)?._count._all ?? 0;
  return { aLire: n("A_LIRE"), aValider: n("A_VALIDER") + n("RECUE"), aDesigner: n("A_DESIGNER") };
}

export type LigneAValider = Awaited<ReturnType<typeof amendesAValider>>["lignes"][number];

/** PV « à valider » (+ anciens « reçus »), échéance la plus proche d'abord, avec les contrats possibles du véhicule. */
export async function amendesAValider() {
  const amendes = await db.amende.findMany({
    where: { statut: { in: ["A_VALIDER", "RECUE"] } },
    orderBy: [{ dateLimite: { sort: "asc", nulls: "last" } }, { creeLe: "asc" }, { fichierPage: "asc" }],
    take: 200,
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true, departPrevuLe: true, departReelLe: true, retourPrevuLe: true, retourReelLe: true } },
      client: { select: { id: true, nom: true, prenom: true, dateNaissance: true, adresse: true, codePostal: true, ville: true, numeroPermis: true, dateDelivrancePermis: true, dateObtentionPermis: true } },
      fichiers: { take: 1, orderBy: { creeLe: "asc" }, select: { id: true, typeMime: true, nomOriginal: true } },
    },
  });
  const vehiculeIds = [...new Set(amendes.map((a) => a.vehiculeId).filter((v): v is string => !!v))];
  const contrats = vehiculeIds.length
    ? await db.contratLocation.findMany({
        where: { vehiculeId: { in: vehiculeIds }, statut: { in: ["EN_COURS", "TERMINEE"] }, archiveLe: null },
        orderBy: { departPrevuLe: "desc" },
        take: 600,
        select: { id: true, numero: true, vehiculeId: true, departPrevuLe: true, departReelLe: true, retourPrevuLe: true, retourReelLe: true, client: { select: { nom: true, prenom: true } } },
      })
    : [];
  const lignes = amendes.map((a) => ({
    id: a.id,
    statut: a.statut,
    numeroAvis: a.numeroAvis,
    dateAvis: a.dateAvis,
    infractionLe: a.infractionLe,
    heureInconnue: a.heureInconnue,
    immatriculationLue: a.immatriculationLue ?? a.vehicule?.immatriculation ?? null,
    nature: a.nature,
    lieu: a.lieu,
    montantCentimes: a.montantCentimes,
    dateLimite: a.dateLimite,
    identificationAuto: a.identificationAuto,
    // La fiche client a pu être complétée depuis la lecture : cette raison est recalculée à chaque affichage.
    raisons: [...((a.raisonsVerification ?? []) as Raison[]).filter((r) => r.code !== "fiche_incomplete"), ...raisonFicheClient(a.client)],
    vehicule: a.vehicule ? { id: a.vehicule.id, nom: nomVehicule(a.vehicule), immatriculation: a.vehicule.immatriculation } : null,
    contrat: a.contrat,
    client: a.client ? { id: a.client.id, nom: a.client.nom, prenom: a.client.prenom } : null,
    fichier: a.fichiers[0] ?? null,
    lu: !!a.luLe,
    contratsPossibles: contrats
      .filter((c) => c.vehiculeId === a.vehiculeId)
      .slice(0, 30)
      .map((c) => ({ id: c.id, numero: c.numero, debut: c.departReelLe ?? c.departPrevuLe, fin: c.retourReelLe ?? c.retourPrevuLe, client: [c.client.prenom, c.client.nom].filter(Boolean).join(" ") })),
  }));
  return { lignes, cleApi: cleApiConfiguree() };
}
