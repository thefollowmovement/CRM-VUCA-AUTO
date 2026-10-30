import { describe, expect, it } from "vitest";
import { dateDepuisParis } from "@/lib/dates";
import {
  champsManquantsPourDesignation,
  dateLimiteDesignation,
  estNumeroAvisValide,
  formatEcart,
  joursAvantLimite,
  memeTitulaire,
  motifRefusValidation,
  nettoyerNumeroAvis,
  normaliserPlaque,
  rapprocherInfraction,
  raisonFicheClient,
  raisonsChamps,
  type ContratRapprochement,
} from "./amendes";

// Heures de Paris (octobre = UTC+2)
const paris = (j: number, h = 0, m = 0, mois = 10) => dateDepuisParis(2026, mois, j, h, m);
const MAINTENANT = paris(23, 12);

function contrat(p: Partial<ContratRapprochement> & { id: string }): ContratRapprochement {
  return {
    numero: `LOC-${p.id}`,
    statut: "TERMINEE",
    clientId: `client-${p.id}`,
    departPrevuLe: paris(1, 10),
    retourPrevuLe: paris(5, 10),
    departReelLe: null,
    retourReelLe: null,
    nbConducteursAdditionnels: 0,
    ...p,
  };
}
const codes = (r: { raisons: { code: string }[] }) => r.raisons.map((x) => x.code);

describe("normalisations", () => {
  it("plaque SIV normalisée, quelle que soit la saisie", () => {
    expect(normaliserPlaque("ab 123 cd")).toBe("AB-123-CD");
    expect(normaliserPlaque("AB123CD")).toBe("AB-123-CD");
    expect(normaliserPlaque(" ab-123-cd ")).toBe("AB-123-CD");
    expect(normaliserPlaque("1234 AB 75")).toBe("1234 AB 75"); // ancienne plaque FNI : gardée telle quelle
    expect(normaliserPlaque("")).toBeNull();
  });
  it("numéro d'avis : 10, 12 ou 18 chiffres", () => {
    expect(estNumeroAvisValide("1234567890")).toBe(true);
    expect(estNumeroAvisValide("123456789012")).toBe(true);
    expect(estNumeroAvisValide("123456789012345678")).toBe(true);
    expect(estNumeroAvisValide("123456789")).toBe(false);
    expect(estNumeroAvisValide("12345678AB")).toBe(false);
    expect(nettoyerNumeroAvis("12 3456 7890")).toBe("1234567890");
  });
  it("titulaire : sans accents ni casse, raison sociale contenue", () => {
    expect(memeTitulaire("Vuca Auto", "VUCA AUTO")).toBe(true);
    expect(memeTitulaire("SAS VUCA-AUTO", "VUCA AUTO")).toBe(true);
    expect(memeTitulaire("Société Générale Location", "VUCA AUTO")).toBe(false);
  });
  it("date limite = date de l'avis + 45 jours, jours restants", () => {
    const limite = dateLimiteDesignation(new Date("2026-10-02T00:00:00Z"));
    expect(limite.toISOString().slice(0, 10)).toBe("2026-11-16");
    expect(joursAvantLimite(limite, "2026-11-06")).toBe(10);
    expect(joursAvantLimite(limite, "2026-11-17")).toBe(-1);
  });
  it("écarts lisibles", () => {
    expect(formatEcart(40 * 60_000)).toBe("40 min");
    expect(formatEcart(80 * 60_000)).toBe("1 h 20");
    expect(formatEcart(120 * 60_000)).toBe("2 h");
  });
});

describe("contrôles après extraction", () => {
  const ctx = { raisonSociale: "VUCA AUTO", aujourdhuiISO: "2026-10-23" };
  const ok = { numeroAvis: "1234567890", dateAvisISO: "2026-10-02", dateInfractionISO: "2026-09-21", plaque: "AB-123-CD", nomTitulaire: "VUCA AUTO" };
  it("avis propre : aucune raison", () => {
    expect(raisonsChamps(ok, ctx)).toEqual([]);
  });
  it("numéro douteux, manquant ; plaque douteuse", () => {
    expect(raisonsChamps({ ...ok, numeroAvis: "12345" }, ctx).map((r) => r.code)).toEqual(["numero_douteux"]);
    expect(raisonsChamps({ ...ok, numeroAvis: null }, ctx).map((r) => r.niveau)).toEqual(["blocage"]);
    expect(raisonsChamps({ ...ok, plaque: "AB 12 CD" }, ctx).map((r) => r.code)).toEqual(["plaque_douteuse"]);
  });
  it("dates incohérentes : infraction après l'avis, avis futur, avis de plus d'un an", () => {
    expect(raisonsChamps({ ...ok, dateInfractionISO: "2026-10-05" }, ctx).map((r) => r.code)).toEqual(["date_incoherente"]);
    expect(raisonsChamps({ ...ok, dateAvisISO: "2026-10-30" }, ctx).map((r) => r.code)).toEqual(["date_incoherente"]);
    expect(raisonsChamps({ ...ok, dateAvisISO: "2025-09-01", dateInfractionISO: "2025-08-20" }, ctx).map((r) => r.code)).toEqual(["date_incoherente"]);
  });
  it("avis adressé à un autre titulaire", () => {
    expect(raisonsChamps({ ...ok, nomTitulaire: "DUPONT Jean" }, ctx).map((r) => r.texte)).toEqual(["Avis adressé à un autre titulaire"]);
  });
  it("confiance moyenne / basse → « À relire », sauf champ vérifié à la main", () => {
    const confiance = { numero_avis: "haute", heure_infraction: "basse", immatriculation: "moyenne" } as const;
    expect(raisonsChamps(ok, { ...ctx, confiance }).map((r) => r.texte)).toEqual(["À relire : heure de l'infraction", "À relire : plaque"]);
    expect(raisonsChamps(ok, { ...ctx, confiance, champsVerifies: ["immatriculation"] }).map((r) => r.texte)).toEqual(["À relire : heure de l'infraction"]);
  });
});

describe("rapprochement avec la location", () => {
  const a = contrat({ id: "a", departPrevuLe: paris(1, 10), retourPrevuLe: paris(5, 10), retourReelLe: paris(5, 9) });
  const b = contrat({ id: "b", departPrevuLe: paris(10, 9), retourPrevuLe: paris(15, 18) });

  it("un seul contrat → rattaché, sans raison", () => {
    const r = rapprocherInfraction([a, b], { date: paris(3, 14, 32), heureInconnue: false }, MAINTENANT);
    expect(r.contrat?.id).toBe("a");
    expect(r.raisons).toEqual([]);
  });
  it("le retour EFFECTIF fait foi : 40 min après le retour → aucun contrat, avec l'indice", () => {
    const r = rapprocherInfraction([a, b], { date: paris(5, 9, 40), heureInconnue: false }, MAINTENANT);
    expect(r.contrat).toBeNull();
    expect(r.raisons.map((x) => x.texte)).toEqual(["Aucune location en cours à ce moment (véhicule en agence ?)", "Infraction 40 min après le retour du véhicule (LOC-a)"]);
  });
  it("aucun contrat (véhicule en agence)", () => {
    const r = rapprocherInfraction([a, b], { date: paris(7, 12), heureInconnue: false }, MAINTENANT);
    expect(r.contrat).toBeNull();
    expect(codes(r)).toEqual(["aucun_contrat"]);
    expect(r.raisons[0]!.niveau).toBe("blocage");
  });
  it("plusieurs contrats qui se chevauchent → rien n'est rattaché", () => {
    const c = contrat({ id: "c", departPrevuLe: paris(4, 8), retourPrevuLe: paris(6, 8) });
    const r = rapprocherInfraction([a, c], { date: paris(4, 12), heureInconnue: false }, MAINTENANT);
    expect(r.contrat).toBeNull();
    expect(codes(r)).toEqual(["plusieurs_contrats"]);
  });
  it("à moins de 2 h de la remise ou du retour → rattaché, à vérifier", () => {
    const r1 = rapprocherInfraction([b], { date: paris(10, 10), heureInconnue: false }, MAINTENANT);
    expect(r1.contrat?.id).toBe("b");
    expect(r1.raisons.map((x) => x.texte)).toEqual(["Infraction proche de la remise (1 h après)"]);
    const r2 = rapprocherInfraction([a], { date: paris(5, 8, 20), heureInconnue: false }, MAINTENANT);
    expect(r2.raisons.map((x) => x.texte)).toEqual(["Infraction proche du retour (40 min avant)"]);
  });
  it("la remise RÉELLE fait foi quand elle existe", () => {
    const d = contrat({ id: "d", departPrevuLe: paris(10, 9), departReelLe: paris(10, 15), retourPrevuLe: paris(12, 9) });
    expect(rapprocherInfraction([d], { date: paris(10, 11), heureInconnue: false }, MAINTENANT).contrat).toBeNull();
  });
  it("location en cours sans retour : compte jusqu'à maintenant (même au-delà du retour prévu)", () => {
    const e = contrat({ id: "e", statut: "EN_COURS", departPrevuLe: paris(18, 9), departReelLe: paris(18, 9), retourPrevuLe: paris(20, 9) });
    const r = rapprocherInfraction([e], { date: paris(22, 16), heureInconnue: false }, MAINTENANT);
    expect(r.contrat?.id).toBe("e");
    expect(r.raisons).toEqual([]);
  });
  it("réservation non partie et location annulée ignorées", () => {
    const f = contrat({ id: "f", statut: "RESERVATION", departPrevuLe: paris(1, 9), retourPrevuLe: paris(30, 9) });
    const g = contrat({ id: "g", statut: "ANNULEE", departPrevuLe: paris(1, 9), retourPrevuLe: paris(30, 9) });
    expect(codes(rapprocherInfraction([f, g], { date: paris(3, 12), heureInconnue: false }, MAINTENANT))).toEqual(["aucun_contrat"]);
  });
  it("heure inconnue : contrat qui couvre toute la journée → rattaché", () => {
    const r = rapprocherInfraction([a, b], { date: paris(3, 12), heureInconnue: true }, MAINTENANT);
    expect(r.contrat?.id).toBe("a");
  });
  it("heure inconnue : changement de locataire ce jour-là → rien n'est rattaché", () => {
    const h = contrat({ id: "h", departPrevuLe: paris(5, 14), retourPrevuLe: paris(8, 10) });
    const r = rapprocherInfraction([a, h], { date: paris(5, 12), heureInconnue: true }, MAINTENANT);
    expect(r.contrat).toBeNull();
    expect(r.raisons.map((x) => x.texte)).toEqual(["Heure absente, changement de locataire ce jour-là"]);
    // Remise ce jour-là sans locataire avant : on ne sait pas non plus.
    expect(codes(rapprocherInfraction([b], { date: paris(10, 12), heureInconnue: true }, MAINTENANT))).toEqual(["heure_absente"]);
  });
  it("conducteur additionnel → locataire principal rattaché, à vérifier", () => {
    const i = contrat({ id: "i", nbConducteursAdditionnels: 1 });
    const r = rapprocherInfraction([i], { date: paris(3, 12), heureInconnue: false }, MAINTENANT);
    expect(r.contrat?.clientId).toBe("client-i");
    expect(r.raisons.map((x) => x.texte)).toEqual(["Conducteur additionnel sur ce contrat : vérifier qui conduisait"]);
  });
});

describe("fiche client pour l'ANTAI", () => {
  const complet = {
    nom: "DUPONT", prenom: "Jean", dateNaissance: new Date("1990-05-14T00:00:00Z"), adresse: "5 avenue de la République", codePostal: "75011", ville: "Paris",
    numeroPermis: "123456789012", dateDelivrancePermis: new Date("2012-03-01T00:00:00Z"), dateObtentionPermis: null,
  };
  it("fiche complète : rien ne manque", () => {
    expect(champsManquantsPourDesignation(complet)).toEqual([]);
    expect(raisonFicheClient(complet)).toEqual([]);
  });
  it("date de délivrance absente : la date d'obtention est reprise", () => {
    expect(champsManquantsPourDesignation({ ...complet, dateDelivrancePermis: null, dateObtentionPermis: new Date("2010-01-01T00:00:00Z") })).toEqual([]);
  });
  it("champs manquants listés, raison bloquante", () => {
    const r = raisonFicheClient({ ...complet, prenom: " ", adresse: null, dateDelivrancePermis: null });
    expect(r).toEqual([{ code: "fiche_incomplete", texte: "Fiche client incomplète : prénom, adresse, date de délivrance du permis", niveau: "blocage" }]);
  });
  it("validation refusée sans client, fiche incomplète, numéro ou date d'avis manquant", () => {
    const base = { clientId: "c1", client: complet, numeroAvis: "1234567890", dateAvis: new Date() };
    expect(motifRefusValidation(base)).toBeNull();
    expect(motifRefusValidation({ ...base, clientId: null, client: null })).toBe("aucun locataire rattaché");
    expect(motifRefusValidation({ ...base, client: { ...complet, ville: null } })).toBe("fiche client incomplète (ville)");
    expect(motifRefusValidation({ ...base, numeroAvis: null })).toBe("numéro d'avis manquant");
  });
});
