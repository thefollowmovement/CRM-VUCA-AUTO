// =====================================================================
//  Traitement des PV importés : lecture (Claude), contrôles, doublons,
//  rapprochement avec la location. Appelé par la file de lecture
//  (file.ts) et par les corrections faites dans l'écran « À valider ».
//  Les règles elles-mêmes sont pures et testées : lib/calculs/amendes.ts.
// =====================================================================
import type { Prisma } from "@/generated/prisma/client";
import {
  dateLimiteDesignation,
  nettoyerNumeroAvis,
  normaliserPlaque,
  rapprocherInfraction,
  raisonFicheClient,
  raisonsChamps,
  type ChampConfiance,
  type Confiance,
  type Raison,
} from "@/lib/calculs/amendes";
import { dateDepuisParis, jourParisISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { lireReglages } from "@/lib/reglages";
import { stockage } from "@/lib/storage";
import { ErreurLecture, lireAvis, type Extraction } from "./lecture";

type Tx = Prisma.TransactionClient;
type ClientDb = typeof db | Tx;

const TYPES: Record<string, "CONTRAVENTION" | "AMENDE_FORFAITAIRE_DELICTUELLE" | "AMENDE_MAJOREE" | "AUTRE"> = {
  contravention: "CONTRAVENTION",
  amende_forfaitaire_delictuelle: "AMENDE_FORFAITAIRE_DELICTUELLE",
  amende_majoree: "AMENDE_MAJOREE",
  autre: "AUTRE",
};

/** Raison sociale attendue sur les avis (réglage Amendes, sinon nom de la société). */
export async function raisonSocialeAvis(client: ClientDb = db): Promise<string> {
  const r = await (client === db ? lireReglages() : client.reglages.findUnique({ where: { id: 1 } }));
  return r?.amendesRaisonSociale?.trim() || r?.societeNom || "VUCA AUTO";
}

/** « 2026-09-21 » + « 14:32 » (heure de Paris) → instant ; sans heure → midi ce jour-là. */
export function instantInfraction(dateISO: string | null, heure: string | null): { date: Date; heureInconnue: boolean } | null {
  const d = dateISO ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO) : null;
  if (!d) return null;
  const h = heure ? /^(\d{1,2})[:hH](\d{2})$/.exec(heure.trim()) : null;
  const heures = h ? Number(h[1]) : NaN;
  const minutes = h ? Number(h[2]) : NaN;
  const heureValide = heures >= 0 && heures < 24 && minutes >= 0 && minutes < 60;
  return { date: dateDepuisParis(Number(d[1]), Number(d[2]), Number(d[3]), heureValide ? heures : 12, heureValide ? minutes : 0), heureInconnue: !heureValide };
}

/** « 2026-10-02 » → date calendaire (minuit UTC, comme @db.Date). */
export function dateCalendaire(iso: string | null): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Véhicule dont la plaque correspond (comparaison sans espaces ni tirets). */
async function vehiculeParPlaque(client: ClientDb, plaque: string | null) {
  if (!plaque) return null;
  const compacte = plaque.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const vehicules = await client.vehicule.findMany({ where: { immatriculation: { not: null } }, select: { id: true, immatriculation: true, statut: true } });
  const trouves = vehicules.filter((v) => v.immatriculation!.replace(/[^A-Z0-9]/gi, "").toUpperCase() === compacte);
  // Plaque réutilisée (véhicule archivé puis racheté ?) : on préfère un véhicule non archivé.
  return trouves.find((v) => v.statut !== "ARCHIVE") ?? trouves[0] ?? null;
}

const SELECT_CLIENT = {
  id: true, nom: true, prenom: true, dateNaissance: true, adresse: true, codePostal: true, ville: true,
  numeroPermis: true, dateDelivrancePermis: true, dateObtentionPermis: true,
} as const;

/**
 * Recalcule ce qui dépend des champs d'un PV : véhicule (d'après la plaque), location et client
 * (si l'identification est automatique), date limite, raisons de vérification.
 * Ne change pas le statut. Renvoie les raisons enregistrées.
 */
export async function evaluerAmende(client: ClientDb, id: string, maintenant = new Date()): Promise<Raison[]> {
  const a = await client.amende.findUniqueOrThrow({ where: { id } });
  const raisonSociale = await raisonSocialeAvis(client);
  const brut = (a.ocrBrut ?? null) as { nom_titulaire?: string | null } | null;
  const lectureEchouee = !!(a.ocrBrut && (a.ocrBrut as { erreur?: string }).erreur);

  // PV saisi à la main (sans plaque lue) : on contrôle la plaque du véhicule choisi.
  const plaqueControlee =
    a.immatriculationLue ?? (a.vehiculeId ? ((await client.vehicule.findUnique({ where: { id: a.vehiculeId }, select: { immatriculation: true } }))?.immatriculation ?? null) : null);

  const raisons: Raison[] = [];
  if (lectureEchouee) raisons.push({ code: "lecture_impossible", texte: "Lecture impossible : saisissez les champs à la main", niveau: "blocage" });

  // Contrôles des champs
  raisons.push(
    ...raisonsChamps(
      {
        numeroAvis: a.numeroAvis,
        dateAvisISO: a.dateAvis ? a.dateAvis.toISOString().slice(0, 10) : null,
        dateInfractionISO: a.infractionLe ? jourParisISO(a.infractionLe) : null,
        plaque: normaliserPlaque(plaqueControlee),
        nomTitulaire: brut?.nom_titulaire ?? null,
      },
      { raisonSociale, aujourdhuiISO: jourParisISO(maintenant), confiance: (a.ocrConfiance ?? null) as Partial<Record<ChampConfiance, Confiance>> | null, champsVerifies: a.champsVerifies },
    ).filter((r) => !(lectureEchouee && r.code.startsWith("relire:"))),
  );

  // Véhicule d'après la plaque lue (sauf PV saisi à la main, sans plaque lue)
  let vehiculeId = a.vehiculeId;
  if (a.immatriculationLue) {
    const v = await vehiculeParPlaque(client, a.immatriculationLue);
    vehiculeId = v?.id ?? null;
    if (!v) raisons.push({ code: "vehicule_inconnu", texte: "Véhicule inconnu", niveau: "blocage" });
  } else if (!vehiculeId) {
    raisons.push({ code: "vehicule_inconnu", texte: "Véhicule inconnu", niveau: "blocage" });
  }

  // Location et client
  let contratId = a.contratId;
  let clientId = a.clientId;
  if (a.identificationAuto) {
    contratId = null;
    clientId = null;
    if (vehiculeId && a.infractionLe) {
      const contrats = await client.contratLocation.findMany({
        where: { vehiculeId, archiveLe: null, statut: { in: ["EN_COURS", "TERMINEE"] } },
        select: { id: true, numero: true, statut: true, clientId: true, departPrevuLe: true, retourPrevuLe: true, departReelLe: true, retourReelLe: true, _count: { select: { conducteursAdditionnels: true } } },
      });
      const r = rapprocherInfraction(
        contrats.map((c) => ({ ...c, nbConducteursAdditionnels: c._count.conducteursAdditionnels })),
        { date: a.infractionLe, heureInconnue: a.heureInconnue },
        maintenant,
      );
      contratId = r.contrat?.id ?? null;
      clientId = r.contrat?.clientId ?? null;
      raisons.push(...r.raisons);
    } else if (vehiculeId && !a.infractionLe) {
      raisons.push({ code: "date_infraction_manquante", texte: "Date de l'infraction manquante", niveau: "blocage" });
    }
  } else if (contratId) {
    // Contrat choisi à la main : le conducteur additionnel reste à vérifier
    const nb = await client.conducteurAdditionnel.count({ where: { contratId } });
    if (nb > 0) raisons.push({ code: "conducteur_additionnel", texte: "Conducteur additionnel sur ce contrat : vérifier qui conduisait", niveau: "attention" });
  }

  if (clientId) {
    const fiche = await client.client.findUnique({ where: { id: clientId }, select: SELECT_CLIENT });
    raisons.push(...raisonFicheClient(fiche));
  }

  await client.amende.update({
    where: { id },
    data: {
      vehiculeId,
      contratId,
      clientId,
      dateLimite: a.dateAvis ? dateLimiteDesignation(a.dateAvis) : a.dateLimite,
      raisonsVerification: raisons as unknown as Prisma.InputJsonValue,
    },
  });
  return raisons;
}

/** Applique une extraction aux champs du PV (avant contrôles). */
function champsDepuisExtraction(e: Extraction) {
  const instant = instantInfraction(e.date_infraction, e.heure_infraction);
  return {
    typeAvis: e.type_avis ? TYPES[e.type_avis] : null,
    numeroAvis: nettoyerNumeroAvis(e.numero_avis),
    dateAvis: dateCalendaire(e.date_avis),
    infractionLe: instant?.date ?? null,
    heureInconnue: instant?.heureInconnue ?? false,
    immatriculationLue: normaliserPlaque(e.immatriculation),
    lieu: e.lieu,
    nature: e.nature,
    montantCentimes: e.montant_forfaitaire != null ? Math.round(e.montant_forfaitaire * 100) : null,
  };
}

/**
 * Lit un PV « à lire » : appel à Claude, enregistrement des champs, doublons, rapprochement.
 * En cas d'échec : PV « à valider » avec la raison « Lecture impossible » (saisie à la main).
 */
export async function traiterAmende(id: string, options: { lire?: typeof lireAvis } = {}): Promise<void> {
  const a = await db.amende.findUnique({ where: { id }, include: { fichiers: { orderBy: { creeLe: "asc" }, take: 1 } } });
  if (!a || a.statut !== "A_LIRE") return;
  const fichier = a.fichiers[0];
  const reglages = await lireReglages();
  const lire = options.lire ?? lireAvis;

  let resultat: Awaited<ReturnType<typeof lireAvis>> | null = null;
  let erreur: ErreurLecture | null = null;
  try {
    if (!fichier) throw new ErreurLecture("Lecture impossible : scan introuvable");
    const contenu = await stockage.lire(fichier.cleStockage);
    resultat = await lire({ contenu, typeMime: fichier.typeMime, modele: reglages.amendesModele });
  } catch (e) {
    erreur = e instanceof ErreurLecture ? e : new ErreurLecture("Lecture impossible", e instanceof Error ? e.message : String(e));
  }

  if (!resultat) {
    await db.amende.update({
      where: { id },
      data: { statut: "A_VALIDER", ocrEnCoursLe: null, luLe: new Date(), ocrTentatives: { increment: 1 }, ocrBrut: { erreur: erreur?.message ?? "Lecture impossible", detail: erreur?.detail?.slice(0, 500) ?? null } },
    });
    await evaluerAmende(db, id);
    // Le libellé précis (clé refusée, service indisponible…) remplace le texte générique.
    if (erreur) await remplacerRaison(id, "lecture_impossible", erreur.message);
    return;
  }

  const { extraction, brut, modele, tokensEntree, tokensSortie } = resultat;
  const commun = {
    ocrBrut: brut as Prisma.InputJsonValue,
    ocrConfiance: extraction.confiance as Prisma.InputJsonValue,
    ocrModele: modele,
    ocrTokensEntree: tokensEntree,
    ocrTokensSortie: tokensSortie,
    ocrTentatives: { increment: 1 },
    ocrEnCoursLe: null,
    luLe: new Date(),
  };

  if (!extraction.est_un_avis) {
    await db.amende.update({ where: { id }, data: { ...commun, statut: "IGNORE", raisonsVerification: [{ code: "pas_un_avis", texte: "Page sans avis", niveau: "attention" }] } });
    return;
  }

  const champs = champsDepuisExtraction(extraction);
  await db.$transaction(async (tx) => {
    // Doublon : verrou sur le numéro pour que deux pages lues en même temps ne passent pas toutes les deux.
    if (champs.numeroAvis) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"amende:" + champs.numeroAvis}))`;
      const original = await tx.amende.findFirst({ where: { numeroAvis: champs.numeroAvis, id: { not: id }, statut: { notIn: ["IGNORE", "A_LIRE"] } }, orderBy: { creeLe: "asc" }, select: { id: true } });
      if (original) {
        await tx.amende.update({
          where: { id },
          data: { ...commun, ...champs, statut: "IGNORE", doublonDeId: original.id, raisonsVerification: [{ code: "doublon", texte: `Doublon de l'avis n° ${champs.numeroAvis}`, niveau: "attention" }] },
        });
        return;
      }
    }
    await tx.amende.update({ where: { id }, data: { ...commun, ...champs, statut: "A_VALIDER" } });
    await evaluerAmende(tx, id);
  });
}

async function remplacerRaison(id: string, code: string, texte: string) {
  const a = await db.amende.findUnique({ where: { id }, select: { raisonsVerification: true } });
  const raisons = ((a?.raisonsVerification ?? []) as Raison[]).map((r) => (r.code === code ? { ...r, texte: `${texte} : saisissez les champs à la main` } : r));
  await db.amende.update({ where: { id }, data: { raisonsVerification: raisons as unknown as Prisma.InputJsonValue } });
}
