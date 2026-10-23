// Lectures des PV (amendes) et sinistres ; identification du conducteur.
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

export async function listerAmendes(statut?: string) {
  const amendes = await db.amende.findMany({
    where: statut ? { statut: statut as never } : {},
    orderBy: { infractionLe: "desc" },
    take: 300,
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true } },
      client: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { fichiers: true, frais: true } },
    },
  });
  return amendes.map((a) => ({ ...a, nomVehicule: a.vehicule ? nomVehicule(a.vehicule) : null }));
}

export async function obtenirAmende(id: string) {
  return db.amende.findUnique({
    where: { id },
    include: {
      vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } },
      contrat: { select: { id: true, numero: true, statut: true } },
      client: { select: { id: true, nom: true, prenom: true, telephone: true, adresse: true, codePostal: true, ville: true, numeroPermis: true, dateNaissance: true, lieuNaissance: true } },
      fichiers: { select: { id: true, nomOriginal: true, typeMime: true } },
      frais: { select: { id: true, montantCentimes: true } },
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
