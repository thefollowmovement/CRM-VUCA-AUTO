// Statistiques du site (vues, clics WhatsApp), comptées par jour (heure de Paris).
import type { TypeStatSite } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ajouterJoursParis, jourParisISO } from "@/lib/dates";

/** Jour calendaire de Paris stocké en base (colonne @db.Date). */
export const jourStat = (date: Date) => new Date(`${jourParisISO(date)}T00:00:00Z`);

/** Totaux d'une annonce sur 7 et 30 jours (aujourd'hui inclus). */
export async function statsAnnonce(annonceId: string, maintenant = new Date()) {
  const depuis30 = jourStat(ajouterJoursParis(maintenant, -29));
  const depuis7 = jourStat(ajouterJoursParis(maintenant, -6));
  const lignes = await db.statistiqueSite.findMany({
    where: { annonceId, jour: { gte: depuis30 }, type: { in: ["VUE_ANNONCE", "CLIC_WHATSAPP"] } },
    select: { jour: true, type: true, compte: true },
  });
  const total = (type: TypeStatSite, depuis: Date) => lignes.filter((l) => l.type === type && l.jour >= depuis).reduce((s, l) => s + l.compte, 0);
  return {
    vues7: total("VUE_ANNONCE", depuis7),
    vues30: total("VUE_ANNONCE", depuis30),
    clics7: total("CLIC_WHATSAPP", depuis7),
    clics30: total("CLIC_WHATSAPP", depuis30),
  };
}

/** Vue d'ensemble du site sur 7 et 30 jours + annonces les plus vues (30 jours). */
export async function statsSite(maintenant = new Date()) {
  const depuis30 = jourStat(ajouterJoursParis(maintenant, -29));
  const depuis7 = jourStat(ajouterJoursParis(maintenant, -6));
  const lignes = await db.statistiqueSite.findMany({ where: { jour: { gte: depuis30 } }, select: { jour: true, type: true, compte: true, annonceId: true } });
  const total = (type: TypeStatSite, depuis: Date) => lignes.filter((l) => l.type === type && l.jour >= depuis).reduce((s, l) => s + l.compte, 0);
  const types: TypeStatSite[] = ["VUE_SITE", "VUE_ANNONCE", "CLIC_WHATSAPP", "CLIC_APPEL"];
  const totaux = Object.fromEntries(types.map((t) => [t, { sept: total(t, depuis7), trente: total(t, depuis30) }])) as Record<TypeStatSite, { sept: number; trente: number }>;

  const parAnnonce = new Map<string, { vues: number; clics: number }>();
  for (const l of lignes) {
    if (!l.annonceId || (l.type !== "VUE_ANNONCE" && l.type !== "CLIC_WHATSAPP")) continue;
    const a = parAnnonce.get(l.annonceId) ?? { vues: 0, clics: 0 };
    if (l.type === "VUE_ANNONCE") a.vues += l.compte;
    else a.clics += l.compte;
    parAnnonce.set(l.annonceId, a);
  }
  const ids = [...parAnnonce.entries()].sort((a, b) => b[1].vues - a[1].vues || b[1].clics - a[1].clics).slice(0, 10).map(([id]) => id);
  const annonces = await db.annonce.findMany({ where: { id: { in: ids } }, select: { id: true, titre: true, vehiculeId: true, publiee: true } });
  const top = ids
    .map((id) => {
      const a = annonces.find((x) => x.id === id);
      return a ? { ...a, ...parAnnonce.get(id)! } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  return { totaux, top };
}
