// Lectures des PV (amendes) et sinistres ; identification du conducteur.
import type { Prisma, StatutAmende } from "@/generated/prisma/client";
import { etatEcheance, JOURS_ECHEANCE_PROCHE, STATUTS_DESIGNATION_EN_ATTENTE } from "@/lib/calculs/amendes";
import { ajouterJoursParis, jourISOVersDateParis, jourParisISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { nomVehicule } from "@/lib/vehicule";

/**
 * Location qui avait le véhicule à cette date/heure : départ (réel sinon prévu) ≤ date
 * < retour (réel ; prévu si terminée sans retour réel ; jamais pour une location en cours).
 */
export async function contratAuMoment(vehiculeId: string, date: Date) {
  const candidats = await db.contratLocation.findMany({
    where: { vehiculeId, statut: { in: ["EN_COURS", "TERMINEE"] }, departPrevuLe: { lte: new Date(date.getTime() + 2 * 86_400_000) } },
    orderBy: { departPrevuLe: "desc" },
    take: 20,
    select: { id: true, numero: true, statut: true, departPrevuLe: true, retourPrevuLe: true, departReelLe: true, retourReelLe: true, clientId: true, client: { select: { nom: true, prenom: true } } },
  });
  return (
    candidats.find((c) => {
      const debut = c.departReelLe ?? c.departPrevuLe;
      const fin = c.retourReelLe ?? (c.statut === "EN_COURS" ? null : c.retourPrevuLe);
      return debut <= date && (fin === null || date < fin);
    }) ?? null
  );
}

export type FiltresAmendes = { statut?: string; clientId?: string; vehiculeId?: string; contratId?: string; du?: string; au?: string; echeance?: "proche" | "depassee" };

/**
 * Liste des PV filtrée. Période = date de l'infraction (sinon de l'avis) ; échéance : « proche » = délai de
 * désignation dans moins de 10 jours, « depassee » = délai passé — seulement pour les PV encore à désigner.
 */
export async function listerAmendes(f: FiltresAmendes = {}) {
  const aujourdhui = jourParisISO(new Date());
  const jourUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const et: Prisma.AmendeWhereInput[] = [];
  if (f.statut) et.push({ statut: f.statut as StatutAmende });
  if (f.clientId) et.push({ clientId: f.clientId });
  if (f.vehiculeId) et.push({ vehiculeId: f.vehiculeId });
  if (f.contratId) et.push({ contratId: f.contratId });
  const du = f.du ? jourISOVersDateParis(f.du) : null;
  const au = f.au ? jourISOVersDateParis(f.au) : null;
  if (du || au) {
    const finAu = au ? ajouterJoursParis(au, 1) : null;
    et.push({
      OR: [
        { infractionLe: { ...(du ? { gte: du } : {}), ...(finAu ? { lt: finAu } : {}) } },
        { infractionLe: null, dateAvis: { ...(f.du ? { gte: jourUtc(f.du) } : {}), ...(f.au ? { lte: jourUtc(f.au) } : {}) } },
      ],
    });
  }
  if (f.echeance) {
    et.push({ statut: { in: [...STATUTS_DESIGNATION_EN_ATTENTE] } });
    et.push(
      f.echeance === "depassee"
        ? { dateLimite: { lt: jourUtc(aujourdhui) } }
        : { dateLimite: { gte: jourUtc(aujourdhui), lt: new Date(jourUtc(aujourdhui).getTime() + JOURS_ECHEANCE_PROCHE * 86_400_000) } },
    );
  }
  const amendes = await db.amende.findMany({
    where: { AND: et },
    orderBy: f.echeance ? [{ dateLimite: "asc" }] : [{ creeLe: "desc" }],
    take: 300,
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true } },
      client: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { fichiers: true, frais: true } },
    },
  });
  return amendes.map((a) => ({ ...a, nomVehicule: a.vehicule ? nomVehicule(a.vehicule) : null, echeance: etatEcheance(a.dateLimite, a.statut, aujourdhui) }));
}

/** Choix des filtres : véhicules et clients qui ont au moins un PV. */
export async function choixFiltresAmendes() {
  const [vehicules, clients] = await Promise.all([
    db.vehicule.findMany({ where: { amendes: { some: {} } }, orderBy: { marque: "asc" }, select: { id: true, marque: true, modele: true, version: true, immatriculation: true } }),
    db.client.findMany({ where: { amendes: { some: {} } }, orderBy: [{ nom: "asc" }, { prenom: "asc" }], select: { id: true, nom: true, prenom: true } }),
  ]);
  return {
    vehicules: vehicules.map((v) => ({ id: v.id, libelle: `${v.immatriculation ?? ""} ${nomVehicule(v)}`.trim() })),
    clients: clients.map((c) => ({ id: c.id, libelle: [c.nom, c.prenom].filter(Boolean).join(" ") })),
  };
}

/** Compteurs du tableau de bord : à valider, à désigner, délai dans moins de 10 jours, délai dépassé. */
export async function resumeAmendes() {
  const aujourdhui = new Date(`${jourParisISO(new Date())}T00:00:00Z`);
  const enAttente = { statut: { in: [...STATUTS_DESIGNATION_EN_ATTENTE] } };
  const [aValider, aDesigner, proches, depasses] = await Promise.all([
    db.amende.count({ where: { statut: { in: ["A_VALIDER", "RECUE"] } } }),
    db.amende.count({ where: { statut: "A_DESIGNER" } }),
    db.amende.count({ where: { ...enAttente, dateLimite: { gte: aujourdhui, lt: new Date(aujourdhui.getTime() + JOURS_ECHEANCE_PROCHE * 86_400_000) } } }),
    db.amende.count({ where: { ...enAttente, dateLimite: { lt: aujourdhui } } }),
  ]);
  return { aValider, aDesigner, proches, depasses };
}

export async function obtenirAmende(id: string) {
  return db.amende.findUnique({
    where: { id },
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true, statut: true } },
      client: {
        select: {
          id: true, nom: true, prenom: true, telephone: true, adresse: true, adresseComplement: true, codePostal: true, ville: true, numeroPermis: true,
          dateNaissance: true, lieuNaissance: true, dateDelivrancePermis: true, dateObtentionPermis: true,
        },
      },
      fichiers: { orderBy: { creeLe: "asc" }, select: { id: true, nomOriginal: true, typeMime: true } },
      frais: { select: { id: true, type: true, libelle: true, montantCentimes: true } },
      creePar: { select: { nom: true } },
      lotImport: { select: { id: true } },
      doublonDe: { select: { id: true, numeroAvis: true } },
    },
  });
}

export async function listerSinistres(vehiculeId?: string) {
  const sinistres = await db.sinistre.findMany({
    where: { vehiculeId },
    orderBy: { survenuLe: "desc" },
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true, client: { select: { nom: true, prenom: true } } } },
      _count: { select: { fichiers: true } },
    },
  });
  return sinistres.map((s) => ({ ...s, nomVehicule: nomVehicule(s.vehicule) }));
}

export async function obtenirSinistre(id: string) {
  return db.sinistre.findUnique({
    where: { id },
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true, statut: true, client: { select: { id: true, nom: true, prenom: true } } } },
      fichiers: { orderBy: { creeLe: "asc" }, select: { id: true, categorie: true, nomOriginal: true, typeMime: true } },
    },
  });
}

/** Véhicules proposés dans les formulaires PV / sinistre (location et mixtes en premier, non archivés). */
export async function vehiculesPourIncidents() {
  const v = await db.vehicule.findMany({
    where: { statut: { not: "ARCHIVE" } },
    orderBy: [{ typeExploitation: "desc" }, { marque: "asc" }],
    select: { id: true, marque: true, modele: true, version: true, immatriculation: true },
  });
  return v.map((x) => ({ id: x.id, libelle: `${nomVehicule(x)}${x.immatriculation ? ` · ${x.immatriculation}` : ""}` }));
}
