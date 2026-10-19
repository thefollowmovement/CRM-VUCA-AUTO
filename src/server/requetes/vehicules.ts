// Lectures des véhicules (filtres, tri, indicateurs calculés).
import type { Prisma } from "@/generated/prisma/client";
import type { StatutVehicule, TypeExploitation } from "@/generated/prisma/enums";
import { coutDeRevient, joursEnStock, margePrevisionnelle } from "@/lib/calculs/vehicule";
import { db } from "@/lib/db";
import { dateCalendaireDepuisISO } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";

export type EtatListe = "stock" | "vendus" | "archives" | "tous";

export type FiltresVehicules = {
  q?: string;
  etat?: EtatListe;
  statut?: StatutVehicule;
  type?: TypeExploitation;
  financeur?: string;
  marque?: string;
  du?: string;
  au?: string;
  tri?: string;
  ordre?: "asc" | "desc";
};

export const COLONNES_TRI = [
  "vehicule",
  "immatriculation",
  "statut",
  "dateAchat",
  "prixAchat",
  "coutDeRevient",
  "prixCible",
  "marge",
  "jours",
] as const;

const STATUTS_VALIDES = new Set<string>(["EN_PREPARATION", "EN_VENTE", "RESERVE", "DISPONIBLE_LOCATION", "EN_LOCATION", "IMMOBILISE", "VENDU", "ARCHIVE"]);
const TYPES_VALIDES = new Set<string>(["ACHAT_REVENTE", "LOCATION", "MIXTE"]);

/** Lit et nettoie les filtres depuis les paramètres d'URL. */
export function lireFiltres(params: Record<string, string | string[] | undefined>): FiltresVehicules {
  const un = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const etat = un("etat");
  const statut = un("statut");
  const type = un("type");
  const tri = un("tri");
  return {
    q: un("q")?.slice(0, 100),
    etat: etat === "vendus" || etat === "archives" || etat === "tous" ? etat : "stock",
    statut: statut && STATUTS_VALIDES.has(statut) ? (statut as StatutVehicule) : undefined,
    type: type && TYPES_VALIDES.has(type) ? (type as TypeExploitation) : undefined,
    financeur: un("financeur"),
    marque: un("marque"),
    du: un("du"),
    au: un("au"),
    tri: tri && (COLONNES_TRI as readonly string[]).includes(tri) ? tri : "dateAchat",
    ordre: un("ordre") === "asc" ? "asc" : "desc",
  };
}

function construireWhere(f: FiltresVehicules): Prisma.VehiculeWhereInput {
  const et: Prisma.VehiculeWhereInput[] = [];
  if (f.etat === "stock") et.push({ statut: { notIn: ["VENDU", "ARCHIVE"] } });
  if (f.etat === "vendus") et.push({ statut: "VENDU" });
  if (f.etat === "archives") et.push({ statut: "ARCHIVE" });
  if (f.statut) et.push({ statut: f.statut });
  if (f.type) et.push({ typeExploitation: f.type });
  if (f.marque) et.push({ marque: { equals: f.marque, mode: "insensitive" } });
  if (f.financeur) et.push({ participations: { some: { partenaireId: f.financeur } } });
  const du = f.du ? dateCalendaireDepuisISO(f.du) : null;
  const au = f.au ? dateCalendaireDepuisISO(f.au) : null;
  if (du) et.push({ dateAchat: { gte: du } });
  if (au) et.push({ dateAchat: { lte: au } });
  if (f.q) {
    const q = f.q;
    const compact = q.replace(/[\s-]/g, "");
    et.push({
      OR: [
        { marque: { contains: q, mode: "insensitive" } },
        { modele: { contains: q, mode: "insensitive" } },
        { version: { contains: q, mode: "insensitive" } },
        { immatriculation: { contains: q, mode: "insensitive" } },
        { immatriculation: { contains: compact.replace(/^([A-Z]{2})(\d{3})([A-Z]{2})$/i, "$1-$2-$3"), mode: "insensitive" } },
        { vin: { contains: compact, mode: "insensitive" } },
      ],
    });
  }
  return { AND: et };
}

export type LigneVehicule = Awaited<ReturnType<typeof listerVehicules>>[number];

export async function listerVehicules(f: FiltresVehicules) {
  const vehicules = await db.vehicule.findMany({
    where: construireWhere(f),
    select: {
      id: true,
      marque: true,
      modele: true,
      version: true,
      immatriculation: true,
      statut: true,
      typeExploitation: true,
      dateAchat: true,
      dateVente: true,
      prixAchatCentimes: true,
      prixCibleCentimes: true,
      prixVenteCentimes: true,
      kilometrageActuel: true,
      kilometrageAchat: true,
      ecartFinancementAccepte: true,
      fichiers: { where: { categorie: "PHOTO_VEHICULE", estPrincipale: true }, select: { id: true }, take: 1 },
      estimations: { orderBy: { estimeLe: "desc" }, select: { montantCentimes: true }, take: 1 },
      participations: { select: { montantCentimes: true, partenaire: { select: { nom: true } } } },
    },
  });

  const totaux = await db.depense.groupBy({
    by: ["vehiculeId"],
    where: { vehiculeId: { in: vehicules.map((v) => v.id) } },
    _sum: { montantCentimes: true },
  });
  const depensesParVehicule = new Map(totaux.map((t) => [t.vehiculeId, t._sum.montantCentimes ?? 0]));

  const lignes = vehicules.map((v) => {
    const cout = coutDeRevient(v.prixAchatCentimes, depensesParVehicule.get(v.id) ?? 0);
    const totalFinance = v.participations.reduce((a, p) => a + p.montantCentimes, 0);
    return {
      ...v,
      nom: nomVehicule(v),
      photoId: v.fichiers[0]?.id ?? null,
      coutDeRevientCentimes: cout,
      margeCentimes:
        v.statut === "VENDU" && v.prixVenteCentimes !== null
          ? v.prixVenteCentimes - cout
          : margePrevisionnelle(cout, v.prixCibleCentimes, v.estimations[0]?.montantCentimes ?? null),
      jours: joursEnStock(v.dateAchat, v.dateVente),
      financeurs: v.participations.map((p) => p.partenaire.nom),
      financementIncoherent: totalFinance !== v.prixAchatCentimes,
    };
  });

  // Tri (en mémoire : certaines colonnes sont calculées)
  const valeur = (l: (typeof lignes)[number]): string | number => {
    switch (f.tri) {
      case "vehicule": return l.nom.toLowerCase();
      case "immatriculation": return l.immatriculation ?? "";
      case "statut": return l.statut;
      case "prixAchat": return l.prixAchatCentimes;
      case "coutDeRevient": return l.coutDeRevientCentimes;
      case "prixCible": return l.prixCibleCentimes ?? -Infinity;
      case "marge": return l.margeCentimes ?? -Infinity;
      case "jours": return l.jours;
      default: return l.dateAchat.getTime();
    }
  };
  const sens = f.ordre === "asc" ? 1 : -1;
  lignes.sort((a, b) => {
    const va = valeur(a);
    const vb = valeur(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * sens;
  });
  return lignes;
}

/** Valeurs proposées dans les filtres. */
export async function optionsFiltres() {
  const [marques, financeurs] = await Promise.all([
    db.vehicule.findMany({ distinct: ["marque"], select: { marque: true }, orderBy: { marque: "asc" } }),
    db.partenaire.findMany({
      where: { participations: { some: {} } },
      select: { id: true, nom: true },
      orderBy: [{ type: "asc" }, { nom: "asc" }],
    }),
  ]);
  return { marques: marques.map((m) => m.marque), financeurs };
}

/** Véhicule complet pour la fiche. */
export async function obtenirVehicule(id: string) {
  return db.vehicule.findUnique({
    where: { id },
    include: {
      participations: {
        include: { partenaire: { select: { id: true, nom: true, type: true } } },
        orderBy: [{ partenaire: { type: "asc" } }, { montantCentimes: "desc" }],
      },
      estimations: { orderBy: { estimeLe: "desc" } },
      fichiers: { orderBy: [{ estPrincipale: "desc" }, { ordre: "asc" }, { creeLe: "asc" }] },
    },
  });
}

/** Partenaires proposés dans « Qui finance l'achat ? » (actifs + ceux déjà présents). */
export async function partenairesFinancement(dejaPresents: string[] = []) {
  return db.partenaire.findMany({
    where: { OR: [{ actif: true }, { id: { in: dejaPresents } }] },
    select: { id: true, nom: true, type: true },
    orderBy: [{ type: "asc" }, { nom: "asc" }],
  });
}
