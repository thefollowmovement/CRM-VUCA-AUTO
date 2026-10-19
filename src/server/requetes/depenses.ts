// Lectures des dépenses (liste filtrée, totaux, référentiels du formulaire).
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { dateCalendaireDepuisISO } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";

export type FiltresDepenses = {
  vehicule?: string;
  categorie?: string;
  payeur?: string;
  du?: string;
  au?: string;
};

export function lireFiltresDepenses(params: Record<string, string | string[] | undefined>): FiltresDepenses {
  const un = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 40) || undefined;
  };
  return { vehicule: un("vehicule"), categorie: un("categorie"), payeur: un("payeur"), du: un("du"), au: un("au") };
}

function construireWhere(f: FiltresDepenses): Prisma.DepenseWhereInput {
  const du = f.du ? dateCalendaireDepuisISO(f.du) : null;
  const au = f.au ? dateCalendaireDepuisISO(f.au) : null;
  return {
    vehiculeId: f.vehicule,
    categorieId: f.categorie,
    payeParId: f.payeur,
    date: du || au ? { gte: du ?? undefined, lte: au ?? undefined } : undefined,
  };
}

export type LigneDepense = Awaited<ReturnType<typeof listerDepenses>>["lignes"][number];

/** Dépenses filtrées (les plus récentes d'abord) + totaux par catégorie et par payeur. */
export async function listerDepenses(f: FiltresDepenses) {
  const depenses = await db.depense.findMany({
    where: construireWhere(f),
    orderBy: [{ date: "desc" }, { creeLe: "desc" }],
    select: {
      id: true,
      date: true,
      libelle: true,
      montantCentimes: true,
      payeSurRecettes: true,
      fournisseur: true,
      kilometrage: true,
      note: true,
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      categorie: { select: { id: true, nom: true, icone: true, couleur: true, code: true } },
      payePar: { select: { id: true, nom: true, type: true } },
      _count: { select: { justificatifs: true } },
    },
  });

  const parCategorie = new Map<string, { id: string; nom: string; icone: string | null; couleur: string | null; totalCentimes: number; nombre: number }>();
  const parPayeur = new Map<string, { id: string; nom: string; type: string; totalCentimes: number; surRecettesCentimes: number }>();
  let total = 0;
  for (const d of depenses) {
    total += d.montantCentimes;
    const c = parCategorie.get(d.categorie.id) ?? { ...d.categorie, totalCentimes: 0, nombre: 0 };
    c.totalCentimes += d.montantCentimes;
    c.nombre += 1;
    parCategorie.set(d.categorie.id, c);
    const p = parPayeur.get(d.payePar.id) ?? { ...d.payePar, totalCentimes: 0, surRecettesCentimes: 0 };
    p.totalCentimes += d.montantCentimes;
    if (d.payeSurRecettes) p.surRecettesCentimes += d.montantCentimes;
    parPayeur.set(d.payePar.id, p);
  }

  return {
    lignes: depenses.map((d) => ({ ...d, nomVehicule: nomVehicule(d.vehicule), nbJustificatifs: d._count.justificatifs })),
    totalCentimes: total,
    parCategorie: [...parCategorie.values()].sort((a, b) => b.totalCentimes - a.totalCentimes),
    // VUCA AUTO d'abord, puis du plus gros payeur au plus petit
    parPayeur: [...parPayeur.values()].sort((a, b) => (a.type === b.type ? b.totalCentimes - a.totalCentimes : a.type === "SOCIETE" ? -1 : 1)),
  };
}

/** Référentiels du formulaire de dépense. */
export async function optionsDepense(vehiculeIdInclus?: string) {
  const [categories, partenaires, vehicules] = await Promise.all([
    db.categorieDepense.findMany({ where: { actif: true }, orderBy: [{ ordre: "asc" }, { nom: "asc" }], select: { id: true, nom: true, icone: true, couleur: true } }),
    db.partenaire.findMany({ where: { actif: true }, orderBy: [{ type: "asc" }, { nom: "asc" }], select: { id: true, nom: true, type: true } }),
    db.vehicule.findMany({
      // Véhicules non archivés (+ celui de la dépense modifiée, même archivé)
      where: { OR: [{ statut: { not: "ARCHIVE" } }, ...(vehiculeIdInclus ? [{ id: vehiculeIdInclus }] : [])] },
      orderBy: [{ marque: "asc" }, { modele: "asc" }],
      select: { id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true },
    }),
  ]);
  return {
    categories,
    partenaires,
    vehicules: vehicules.map((v) => ({ id: v.id, libelle: `${nomVehicule(v)}${v.immatriculation ? ` · ${v.immatriculation}` : ""}`, vendu: v.statut === "VENDU" })),
  };
}
export type OptionsDepense = Awaited<ReturnType<typeof optionsDepense>>;

export async function obtenirDepense(id: string) {
  return db.depense.findUnique({
    where: { id },
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      categorie: { select: { nom: true } },
      payePar: { select: { nom: true } },
      justificatifs: { orderBy: { creeLe: "asc" }, select: { id: true, nomOriginal: true, typeMime: true, tailleOctets: true, creeLe: true } },
    },
  });
}
