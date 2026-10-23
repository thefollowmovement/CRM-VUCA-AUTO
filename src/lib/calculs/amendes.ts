// =====================================================================
//  Amendes : règles pures (sans base de données), testées avec Vitest.
//  - normalisation et contrôles des champs lus sur un avis de contravention ;
//  - rapprochement avec la location en cours au moment de l'infraction ;
//  - champs de la fiche client exigés par l'ANTAI pour désigner le conducteur.
// =====================================================================
import { ajouterJoursParis, debutJourParis, MS_PAR_JOUR, MS_PAR_MINUTE } from "@/lib/dates";

/** Délai légal pour désigner le conducteur (à partir de la date de l'avis). */
export const DELAI_DESIGNATION_JOURS = 45;
/** Infraction à moins de 2 h de la remise ou du retour : à vérifier. */
const PROXIMITE_MS = 2 * 60 * MS_PAR_MINUTE;

// ---------------------------------------------------------------------
//  Raisons de vérification (badges de l'écran « À valider »)
// ---------------------------------------------------------------------
/** « attention » = à relire (orange) ; « blocage » = impossible de désigner en l'état (rouge). */
export type NiveauRaison = "attention" | "blocage";
export type Raison = { code: string; texte: string; niveau: NiveauRaison };

export type Confiance = "haute" | "moyenne" | "basse";
export const CHAMPS_CONFIANCE = ["numero_avis", "date_avis", "date_infraction", "heure_infraction", "immatriculation"] as const;
export type ChampConfiance = (typeof CHAMPS_CONFIANCE)[number];
export const LIBELLES_CHAMPS: Record<ChampConfiance, string> = {
  numero_avis: "numéro d'avis",
  date_avis: "date de l'avis",
  date_infraction: "date de l'infraction",
  heure_infraction: "heure de l'infraction",
  immatriculation: "plaque",
};

// ---------------------------------------------------------------------
//  Normalisations
// ---------------------------------------------------------------------
const SIV = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;

/** Met une plaque au format SIV « AB-123-CD » quand c'en est une ; sinon la renvoie en majuscules nettoyées. */
export function normaliserPlaque(brute: string | null | undefined): string | null {
  if (!brute) return null;
  const compacte = brute.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compacte) return null;
  const m = /^([A-Z]{2})(\d{3})([A-Z]{2})$/.exec(compacte);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return brute.toUpperCase().replace(/\s+/g, " ").trim();
}

export function estPlaqueSiv(plaque: string | null | undefined): boolean {
  return !!plaque && SIV.test(plaque);
}

/** Numéro d'avis : chiffres uniquement (espaces retirés). */
export function nettoyerNumeroAvis(brut: string | null | undefined): string | null {
  if (!brut) return null;
  const n = brut.replace(/[\s.-]/g, "");
  return n || null;
}

/** 10 chiffres (avis de contravention) ou 12 / 18 chiffres (amende majorée). */
export function estNumeroAvisValide(numero: string | null | undefined): boolean {
  return !!numero && /^\d+$/.test(numero) && [10, 12, 18].includes(numero.length);
}

/** Texte comparable : sans accents, minuscules, sans ponctuation ni espaces multiples. */
export function texteComparable(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Même titulaire si l'un des noms contient l'autre (« SAS VUCA AUTO » ≈ « VUCA AUTO »). */
export function memeTitulaire(nomLu: string, raisonSociale: string): boolean {
  const a = texteComparable(nomLu);
  const b = texteComparable(raisonSociale);
  if (!a || !b) return true;
  return a.includes(b) || b.includes(a);
}

/** Date limite de désignation : date de l'avis (jour calendaire, minuit UTC) + 45 jours. */
export function dateLimiteDesignation(dateAvis: Date): Date {
  return new Date(dateAvis.getTime() + DELAI_DESIGNATION_JOURS * MS_PAR_JOUR);
}

/** Jours restants avant la date limite (négatif = dépassée). `aujourdhuiISO` = jour de Paris AAAA-MM-JJ. */
export function joursAvantLimite(dateLimite: Date, aujourdhuiISO: string): number {
  return Math.round((dateLimite.getTime() - Date.parse(`${aujourdhuiISO}T00:00:00Z`)) / MS_PAR_JOUR);
}

// ---------------------------------------------------------------------
//  Contrôles des champs (après lecture, et après chaque correction)
// ---------------------------------------------------------------------
export type ChampsAvis = {
  numeroAvis: string | null;
  dateAvisISO: string | null; // AAAA-MM-JJ
  dateInfractionISO: string | null; // AAAA-MM-JJ (jour de Paris)
  plaque: string | null;
  nomTitulaire: string | null;
};

/**
 * Raisons liées aux champs lus : numéro, plaque, dates, titulaire, confiance de la lecture.
 * Un champ corrigé ou confirmé à la main (`champsVerifies`) n'est plus signalé « à relire ».
 */
export function raisonsChamps(
  c: ChampsAvis,
  contexte: { raisonSociale: string; aujourdhuiISO: string; confiance?: Partial<Record<ChampConfiance, Confiance>> | null; champsVerifies?: readonly string[] },
): Raison[] {
  const raisons: Raison[] = [];
  const verifies = new Set(contexte.champsVerifies ?? []);
  if (!c.numeroAvis) raisons.push({ code: "numero_manquant", texte: "Numéro d'avis manquant", niveau: "blocage" });
  else if (!estNumeroAvisValide(c.numeroAvis)) raisons.push({ code: "numero_douteux", texte: "Numéro d'avis douteux", niveau: "attention" });

  if (!estPlaqueSiv(c.plaque)) raisons.push({ code: "plaque_douteuse", texte: "Plaque douteuse", niveau: "attention" });

  if (!c.dateAvisISO) raisons.push({ code: "date_avis_manquante", texte: "Date de l'avis manquante", niveau: "blocage" });
  const unAnAvant = new Date(Date.parse(`${contexte.aujourdhuiISO}T00:00:00Z`) - 365 * MS_PAR_JOUR).toISOString().slice(0, 10);
  const incoherente =
    (c.dateAvisISO && (c.dateAvisISO > contexte.aujourdhuiISO || c.dateAvisISO < unAnAvant)) ||
    (c.dateAvisISO && c.dateInfractionISO && c.dateInfractionISO > c.dateAvisISO) ||
    (c.dateInfractionISO && c.dateInfractionISO > contexte.aujourdhuiISO);
  if (incoherente) raisons.push({ code: "date_incoherente", texte: "Date incohérente", niveau: "attention" });

  if (c.nomTitulaire && !memeTitulaire(c.nomTitulaire, contexte.raisonSociale)) {
    raisons.push({ code: "autre_titulaire", texte: "Avis adressé à un autre titulaire", niveau: "attention" });
  }

  for (const champ of CHAMPS_CONFIANCE) {
    const niveau = contexte.confiance?.[champ];
    if ((niveau === "moyenne" || niveau === "basse") && !verifies.has(champ)) {
      raisons.push({ code: `relire:${champ}`, texte: `À relire : ${LIBELLES_CHAMPS[champ]}`, niveau: "attention" });
    }
  }
  return raisons;
}

// ---------------------------------------------------------------------
//  Rapprochement avec les locations
// ---------------------------------------------------------------------
export type ContratRapprochement = {
  id: string;
  numero: string;
  statut: string; // RESERVATION | EN_COURS | TERMINEE | ANNULEE
  clientId: string;
  departPrevuLe: Date;
  retourPrevuLe: Date;
  departReelLe: Date | null;
  retourReelLe: Date | null;
  nbConducteursAdditionnels: number;
};

export type ResultatRapprochement = { contrat: ContratRapprochement | null; raisons: Raison[] };

/** Période pendant laquelle le locataire avait le véhicule (null = location jamais partie ou annulée). */
export function periodeContrat(c: ContratRapprochement, maintenant: Date): { debut: Date; fin: Date } | null {
  if (c.statut !== "EN_COURS" && c.statut !== "TERMINEE") return null;
  const debut = c.departReelLe ?? c.departPrevuLe;
  // Retour effectif s'il existe ; une location encore en cours compte jusqu'à maintenant.
  const fin = c.retourReelLe ?? (c.statut === "EN_COURS" ? maintenant : c.retourPrevuLe);
  return { debut, fin };
}

/** « 40 min », « 1 h 20 », « 2 h ». */
export function formatEcart(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MS_PAR_MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/**
 * Trouve la location qui avait le véhicule au moment de l'infraction.
 * - un seul contrat couvre l'instant → rattaché (avec une alerte si l'infraction est à moins de 2 h
 *   de la remise ou du retour, ou si le contrat a un conducteur additionnel) ;
 * - aucun → « Aucune location en cours à ce moment » ; plusieurs → « Plusieurs locations possibles » ;
 * - heure inconnue → on raisonne sur la journée entière : rattaché seulement si un même contrat
 *   couvre toute la journée ; si le locataire change ce jour-là, rien n'est rattaché.
 */
export function rapprocherInfraction(
  contrats: ContratRapprochement[],
  infraction: { date: Date; heureInconnue: boolean },
  maintenant: Date,
): ResultatRapprochement {
  const periodes = contrats.map((c) => ({ c, p: periodeContrat(c, maintenant) })).filter((x): x is { c: ContratRapprochement; p: { debut: Date; fin: Date } } => !!x.p);
  const raisons: Raison[] = [];

  if (infraction.heureInconnue) {
    const debutJour = debutJourParis(infraction.date);
    const finJour = ajouterJoursParis(debutJour, 1);
    const touchent = periodes.filter(({ p }) => p.debut < finJour && p.fin > debutJour);
    if (touchent.length === 0) {
      return { contrat: null, raisons: [{ code: "aucun_contrat", texte: "Aucune location en cours à ce moment (véhicule en agence ?)", niveau: "blocage" }] };
    }
    const entier = touchent.length === 1 && touchent[0]!.p.debut <= debutJour && touchent[0]!.p.fin >= finJour;
    if (!entier) {
      return { contrat: null, raisons: [{ code: "heure_absente", texte: "Heure absente, changement de locataire ce jour-là", niveau: "blocage" }] };
    }
    const c = touchent[0]!.c;
    if (c.nbConducteursAdditionnels > 0) raisons.push(raisonConducteurAdditionnel());
    return { contrat: c, raisons };
  }

  const t = infraction.date.getTime();
  const couvrent = periodes.filter(({ p }) => p.debut.getTime() <= t && t <= p.fin.getTime());
  if (couvrent.length > 1) {
    return { contrat: null, raisons: [{ code: "plusieurs_contrats", texte: "Plusieurs locations possibles", niveau: "blocage" }] };
  }
  if (couvrent.length === 0) {
    raisons.push({ code: "aucun_contrat", texte: "Aucune location en cours à ce moment (véhicule en agence ?)", niveau: "blocage" });
    // Indice utile : une remise ou un retour tout proche (ex. « 40 min après le retour »).
    const proches = periodes
      .flatMap(({ c, p }) => [
        { c, ecart: p.debut.getTime() - t, texte: "avant la remise" },
        { c, ecart: t - p.fin.getTime(), texte: "après le retour" },
      ])
      .filter((x) => x.ecart > 0 && x.ecart <= PROXIMITE_MS)
      .sort((a, b) => a.ecart - b.ecart);
    const proche = proches[0];
    if (proche) {
      raisons.push({ code: "proche_hors_contrat", texte: `Infraction ${formatEcart(proche.ecart)} ${proche.texte} du véhicule (${proche.c.numero})`, niveau: "attention" });
    }
    return { contrat: null, raisons };
  }

  const { c, p } = couvrent[0]!;
  const apresRemise = t - p.debut.getTime();
  const avantRetour = p.fin.getTime() - t;
  const retourConnu = c.retourReelLe !== null || c.statut === "TERMINEE";
  if (apresRemise <= PROXIMITE_MS) {
    raisons.push({ code: "proche_remise", texte: `Infraction proche de la remise (${formatEcart(apresRemise)} après)`, niveau: "attention" });
  } else if (retourConnu && avantRetour <= PROXIMITE_MS) {
    raisons.push({ code: "proche_retour", texte: `Infraction proche du retour (${formatEcart(avantRetour)} avant)`, niveau: "attention" });
  }
  if (c.nbConducteursAdditionnels > 0) raisons.push(raisonConducteurAdditionnel());
  return { contrat: c, raisons };
}

function raisonConducteurAdditionnel(): Raison {
  return { code: "conducteur_additionnel", texte: "Conducteur additionnel sur ce contrat : vérifier qui conduisait", niveau: "attention" };
}

// ---------------------------------------------------------------------
//  Fiche client : champs exigés par l'ANTAI
// ---------------------------------------------------------------------
export type ClientDesignation = {
  nom: string | null;
  prenom: string | null;
  dateNaissance: Date | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  numeroPermis: string | null;
  dateDelivrancePermis: Date | null;
  dateObtentionPermis: Date | null;
};

/** Date de délivrance retenue : celle saisie, sinon la date d'obtention du permis (choix validé). */
export function dateDelivranceEffective(c: Pick<ClientDesignation, "dateDelivrancePermis" | "dateObtentionPermis">): Date | null {
  return c.dateDelivrancePermis ?? c.dateObtentionPermis;
}

/** Libellés des champs obligatoires vides (liste vide = fiche complète pour la désignation). */
export function champsManquantsPourDesignation(c: ClientDesignation): string[] {
  const manquants: string[] = [];
  const vide = (v: string | null) => !v || !v.trim();
  if (vide(c.nom)) manquants.push("nom");
  if (vide(c.prenom)) manquants.push("prénom");
  if (!c.dateNaissance) manquants.push("date de naissance");
  if (vide(c.adresse)) manquants.push("adresse");
  if (vide(c.codePostal)) manquants.push("code postal");
  if (vide(c.ville)) manquants.push("ville");
  if (vide(c.numeroPermis)) manquants.push("numéro de permis");
  if (!dateDelivranceEffective(c)) manquants.push("date de délivrance du permis");
  return manquants;
}

/** Raison « Fiche client incomplète : … » (ou aucune). */
export function raisonFicheClient(c: ClientDesignation | null): Raison[] {
  if (!c) return [];
  const manquants = champsManquantsPourDesignation(c);
  return manquants.length ? [{ code: "fiche_incomplete", texte: `Fiche client incomplète : ${manquants.join(", ")}`, niveau: "blocage" }] : [];
}

/** Une ligne peut-elle passer « à désigner » ? Renvoie le motif du refus, ou null. */
export function motifRefusValidation(a: { clientId: string | null; numeroAvis: string | null; dateAvis: Date | null; client: ClientDesignation | null }): string | null {
  if (!a.clientId || !a.client) return "aucun locataire rattaché";
  const manquants = champsManquantsPourDesignation(a.client);
  if (manquants.length) return `fiche client incomplète (${manquants.join(", ")})`;
  if (!a.numeroAvis) return "numéro d'avis manquant";
  if (!a.dateAvis) return "date de l'avis manquante";
  return null;
}
