// Lectures des états des lieux et des dommages.
import type { TypeEtatDesLieux } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { lireReglages } from "@/lib/reglages";
import { libelleDommage, type Gravite, type TypeDommage, type Vue } from "@/lib/schema-vehicule";

const SELECT_DOMMAGE = {
  id: true, vue: true, zone: true, positionX: true, positionY: true, type: true, gravite: true, description: true,
  constateLe: true, repareLe: true, etatDesLieuxConstatationId: true,
  photos: { select: { id: true }, orderBy: { creeLe: "asc" as const } },
  etatDesLieuxConstatation: { select: { type: true, verrouille: true, contrat: { select: { id: true, numero: true } } } },
} as const;

export type DommageAffiche = {
  id: string; numero: number; vue: Vue; zone: string; positionX: number | null; positionY: number | null; type: TypeDommage; gravite: Gravite;
  description: string | null; constateLe: Date; repareLe: Date | null; libelle: string; photoIds: string[];
  etatDesLieuxId: string | null; contrat: { id: string; numero: string; type: TypeEtatDesLieux } | null; supprimable: boolean;
};

type DommageBrut = Awaited<ReturnType<typeof dommagesBruts>>[number];
async function dommagesBruts(vehiculeId: string) {
  return db.dommage.findMany({ where: { vehiculeId }, orderBy: { constateLe: "asc" }, select: SELECT_DOMMAGE });
}

function versAffiche(d: DommageBrut, numero: number): DommageAffiche {
  const edl = d.etatDesLieuxConstatation;
  return {
    id: d.id, numero, vue: d.vue as Vue, zone: d.zone, positionX: d.positionX, positionY: d.positionY, type: d.type as TypeDommage, gravite: d.gravite as Gravite,
    description: d.description, constateLe: d.constateLe, repareLe: d.repareLe, libelle: libelleDommage({ type: d.type as TypeDommage, vue: d.vue as Vue, zone: d.zone }),
    photoIds: d.photos.map((p) => p.id), etatDesLieuxId: d.etatDesLieuxConstatationId,
    contrat: edl ? { id: edl.contrat.id, numero: edl.contrat.numero, type: edl.type } : null,
    // Supprimable : saisi hors état des lieux, ou pendant un état des lieux pas encore signé
    supprimable: !edl || !edl.verrouille,
  };
}

/** Dommages du véhicule : actuels (non réparés) et historique (réparés), numérotés dans l'ordre de constat. */
export async function dommagesVehicule(vehiculeId: string) {
  const tous = (await dommagesBruts(vehiculeId)).map((d, i) => versAffiche(d, i + 1));
  return { actuels: tous.filter((d) => !d.repareLe), repares: tous.filter((d) => d.repareLe) };
}

const VEHICULES_BATTERIE = ["ELECTRIQUE", "HYBRIDE_RECHARGEABLE"];

/**
 * Données de l'assistant de départ / retour. Crée le brouillon d'état des lieux
 * s'il n'existe pas encore (les photos et dommages s'y rattachent au fil de l'eau).
 */
export async function brouillonEtatDesLieux(contratId: string, type: TypeEtatDesLieux, utilisateurId: string) {
  const contrat = await db.contratLocation.findUnique({
    where: { id: contratId },
    include: {
      client: { select: { nom: true, prenom: true } },
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true, carburant: true, kilometrageActuel: true, statut: true } },
      etatsDesLieux: { include: { checklist: true, photos: { select: { id: true, categorie: true }, orderBy: { creeLe: "asc" } } } },
    },
  });
  if (!contrat) return null;
  const depart = contrat.etatsDesLieux.find((e) => e.type === "DEPART") ?? null;
  let edl = contrat.etatsDesLieux.find((e) => e.type === type) ?? null;

  // Conditions pour commencer
  let erreur: string | null = null;
  if (type === "DEPART" && !["RESERVATION", "CONFIRMEE"].includes(contrat.statut)) erreur = "Le départ de cette location a déjà été fait (ou elle est annulée).";
  if (type === "RETOUR" && contrat.statut !== "EN_COURS") erreur = contrat.statut === "TERMINEE" ? "Le retour de cette location a déjà été fait." : "La location n'a pas encore démarré.";
  if (type === "RETOUR" && !depart?.verrouille) erreur ??= "L'état des lieux de départ est introuvable.";
  if (type === "DEPART" && ["IMMOBILISE", "VENDU", "ARCHIVE"].includes(contrat.vehicule.statut)) erreur ??= "Ce véhicule ne peut pas partir en location (immobilisé, vendu ou archivé).";
  if (type === "DEPART" && !erreur) {
    const encore = await db.contratLocation.findFirst({ where: { vehiculeId: contrat.vehiculeId, statut: "EN_COURS", id: { not: contratId } }, select: { numero: true } });
    if (encore) erreur = `Le véhicule n'est pas encore revenu de la location ${encore.numero} : faites d'abord son retour.`;
  }
  if (edl?.verrouille) erreur = "Cet état des lieux est déjà signé.";

  if (!erreur && !edl) {
    edl = await db.etatDesLieux.create({
      data: {
        contratId,
        type,
        kilometrage: type === "RETOUR" ? (depart?.kilometrage ?? 0) : (contrat.vehicule.kilometrageActuel ?? 0),
        realiseParId: utilisateurId,
      },
      include: { checklist: true, photos: { select: { id: true, categorie: true } } },
    });
  }

  const [elements, reglages, dommages] = await Promise.all([
    db.elementChecklist.findMany({ where: { actif: true }, orderBy: [{ ordre: "asc" }, { libelle: "asc" }] }),
    lireReglages(),
    dommagesVehicule(contrat.vehicule.id),
  ]);
  const batterie = VEHICULES_BATTERIE.includes(contrat.vehicule.carburant ?? "");
  const carburant = contrat.vehicule.carburant !== "ELECTRIQUE";
  return {
    erreur,
    contrat,
    edl,
    depart,
    elements: elements.filter((e) => !e.electriqueUniquement || batterie),
    reglages,
    dommages: dommages.actuels,
    mesures: { batterie, carburant },
  };
}
export type DonneesBrouillon = NonNullable<Awaited<ReturnType<typeof brouillonEtatDesLieux>>>;

/** État des lieux signé, pour la consultation. */
export async function etatDesLieuxSigne(contratId: string, type: TypeEtatDesLieux) {
  return db.etatDesLieux.findUnique({
    where: { contratId_type: { contratId, type } },
    include: {
      checklist: { orderBy: { libelle: "asc" } },
      photos: { select: { id: true, categorie: true }, orderBy: { creeLe: "asc" } },
      realisePar: { select: { nom: true } },
      dommagesConstates: { select: { id: true } },
    },
  });
}
