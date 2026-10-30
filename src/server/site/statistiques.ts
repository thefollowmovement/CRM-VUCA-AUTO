// Statistiques du site (vues, clics WhatsApp), comptées par jour (heure de Paris).
import type { TypeStatSite } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ajouterJoursParis, jourParisISO } from "@/lib/dates";
import { agregerStatistiques, tauxContact } from "@/lib/site/statistiques";

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

/** Résumé pour le tableau de bord : visites et clics WhatsApp des `nbJours` derniers jours. */
export async function resumeSite(nbJours = 7, maintenant = new Date()) {
  const depuis = jourStat(ajouterJoursParis(maintenant, -(nbJours - 1)));
  const sommes = await db.statistiqueSite.groupBy({ by: ["type"], where: { jour: { gte: depuis }, type: { in: ["VUE_SITE", "CLIC_WHATSAPP"] } }, _sum: { compte: true } });
  const somme = (t: TypeStatSite) => sommes.find((x) => x.type === t)?._sum.compte ?? 0;
  return { visites: somme("VUE_SITE"), clicsWhatsapp: somme("CLIC_WHATSAPP") };
}

/** Statistiques détaillées sur `nbJours` (page Site web → Statistiques), avec la période précédente. */
export async function statistiquesSite(nbJours: number, maintenant = new Date()) {
  const fin = jourParisISO(maintenant);
  const depuis = jourStat(ajouterJoursParis(maintenant, -(2 * nbJours - 1)));
  const lignes = await db.statistiqueSite.findMany({ where: { jour: { gte: depuis } }, select: { jour: true, type: true, annonceId: true, compte: true } });
  const s = agregerStatistiques(
    lignes.map((l) => ({ jour: l.jour.toISOString().slice(0, 10), type: l.type, annonceId: l.annonceId, compte: l.compte })),
    fin,
    nbJours,
  );
  // Détail par annonce : celles qui ont eu des visites + celles en ligne (même à zéro)
  const annonces = await db.annonce.findMany({
    where: { OR: [{ id: { in: [...s.parAnnonce.keys()] } }, { publiee: true }] },
    select: { id: true, titre: true, reference: true, publiee: true, vehiculeId: true, vehicule: { select: { statut: true } } },
  });
  const detail = annonces
    .map((a) => {
      const t = s.parAnnonce.get(a.id);
      const vues = t?.VUE_ANNONCE ?? 0;
      const clicsWhatsapp = t?.CLIC_WHATSAPP ?? 0;
      const clicsAppel = t?.CLIC_APPEL ?? 0;
      return {
        id: a.id, titre: a.titre, reference: a.reference, vehiculeId: a.vehiculeId,
        etat: a.vehicule.statut === "VENDU" ? ("vendue" as const) : a.publiee ? ("en ligne" as const) : ("retirée" as const),
        vues, clicsWhatsapp, clicsAppel, taux: tauxContact(clicsWhatsapp + clicsAppel, vues),
      };
    })
    .sort((a, b) => b.vues - a.vues || b.clicsWhatsapp - a.clicsWhatsapp || a.titre.localeCompare(b.titre, "fr"));
  return { jours: s.jours, totaux: s.totaux, precedents: s.precedents, detail };
}
