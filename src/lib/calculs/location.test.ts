import { describe, expect, it } from "vitest";
import { ajouterMoisParis, dateVersSaisieParis, saisieParisVersDate } from "@/lib/dates";
import { calculerPrixLocation, chevauche, decomposerDuree, joursFactures, kmInclusTotal, montantKmSupplementaires, tauxOccupation, totalOption } from "./location";

const d = (s: string) => saisieParisVersDate(s)!;

describe("dates à l'heure de Paris", () => {
  it("convertit la saisie en UTC (hiver et été)", () => {
    expect(d("2026-01-15T10:00").toISOString()).toBe("2026-01-15T09:00:00.000Z");
    expect(d("2026-07-15T10:00").toISOString()).toBe("2026-07-15T08:00:00.000Z");
    expect(dateVersSaisieParis(new Date("2026-07-15T08:00:00Z"))).toBe("2026-07-15T10:00");
    expect(saisieParisVersDate("2026-02-31T10:00")).toBeNull();
  });
  it("ajoute des mois date à date", () => {
    expect(dateVersSaisieParis(ajouterMoisParis(d("2026-01-31T10:00"), 1))).toBe("2026-02-28T10:00");
    expect(dateVersSaisieParis(ajouterMoisParis(d("2028-01-31T10:00"), 1))).toBe("2028-02-29T10:00");
    // Le changement d'heure ne décale pas l'heure locale
    expect(dateVersSaisieParis(ajouterMoisParis(d("2026-03-15T09:00"), 1))).toBe("2026-04-15T09:00");
  });
});

describe("journées facturées (24 h entamée due, tolérance)", () => {
  it("compte les journées", () => {
    expect(joursFactures(d("2026-10-20T09:00"), d("2026-10-23T09:00"), 60)).toBe(3);
    expect(joursFactures(d("2026-10-20T09:00"), d("2026-10-23T09:59"), 60)).toBe(3); // dans la tolérance
    expect(joursFactures(d("2026-10-20T09:00"), d("2026-10-23T10:01"), 60)).toBe(4); // tolérance dépassée
    expect(joursFactures(d("2026-10-20T09:00"), d("2026-10-20T12:00"), 60)).toBe(1); // minimum 1 jour
  });
  it("traverse le changement d'heure sans journée en trop", () => {
    // Nuit du 25/10/2026 : 25 h entre les deux 9 h, dans la tolérance de 60 min
    expect(joursFactures(d("2026-10-24T09:00"), d("2026-10-26T09:00"), 60)).toBe(2);
  });
});

describe("prix journalier", () => {
  it("tarif × jours − remise + options + livraison", () => {
    const p = calculerPrixLocation({
      type: "JOURNALIERE", depart: d("2026-10-20T09:00"), retour: d("2026-10-23T09:00"), toleranceMinutes: 60,
      tarifCentimes: 4500, remiseCentimes: 1000, fraisLivraisonCentimes: 2500,
      options: [
        { modeTarif: "PAR_JOUR", prixCentimes: 500, quantite: 1 }, // GPS 5 €/j
        { modeTarif: "FORFAIT", prixCentimes: 1500, quantite: 2 }, // 2 forfaits
      ],
    });
    expect(p.unites).toBe(3);
    expect(p.montantBaseCentimes).toBe(13500);
    expect(p.totalOptions).toEqual([1500, 3000]);
    expect(p.prixTotalCentimes).toBe(13500 - 1000 + 4500 + 2500);
  });
  it("option par jour plafonnée", () => {
    expect(totalOption({ modeTarif: "PAR_JOUR", prixCentimes: 800, quantite: 1, plafondCentimes: 5000 }, 10)).toBe(5000);
    expect(totalOption({ modeTarif: "PAR_JOUR", prixCentimes: 800, quantite: 2, plafondCentimes: 5000 }, 3)).toBe(4800);
  });
});

describe("prix hebdomadaire", () => {
  const base = { type: "HEBDOMADAIRE" as const, toleranceMinutes: 60, tarifCentimes: 25000, tarifJournalierCentimes: 4500 };
  it("10 jours = 1 semaine + 3 jours", () => {
    const p = calculerPrixLocation({ ...base, depart: d("2026-10-01T09:00"), retour: d("2026-10-11T09:00") });
    expect([p.unites, p.joursSupplementaires]).toEqual([1, 3]);
    expect(p.montantBaseCentimes).toBe(25000 + 3 * 4500);
    expect(p.plafondHebdoApplique).toBe(false);
  });
  it("plafonné au prix d'une semaine de plus", () => {
    // 13 jours : 1 sem + 6 j × 45 € = 520 € > 2 semaines (500 €)
    const p = calculerPrixLocation({ ...base, depart: d("2026-10-01T09:00"), retour: d("2026-10-14T09:00") });
    expect(p.montantBaseCentimes).toBe(50000);
    expect([p.unites, p.joursSupplementaires, p.plafondHebdoApplique]).toEqual([2, 0, true]);
  });
  it("semaines pleines", () => {
    const p = calculerPrixLocation({ ...base, depart: d("2026-10-01T09:00"), retour: d("2026-10-15T09:00") });
    expect([p.unites, p.joursSupplementaires, p.montantBaseCentimes]).toEqual([2, 0, 50000]);
  });
  it("sans tarif journalier : jours restants au prorata", () => {
    const p = calculerPrixLocation({ ...base, tarifJournalierCentimes: null, depart: d("2026-10-01T09:00"), retour: d("2026-10-11T09:00") });
    expect(p.montantBaseCentimes).toBe(25000 + Math.round((25000 * 3) / 7));
  });
});

describe("prix mensuel", () => {
  const base = { type: "MENSUELLE" as const, toleranceMinutes: 60, tarifCentimes: 90000 };
  it("mois date à date", () => {
    const p = calculerPrixLocation({ ...base, depart: d("2026-01-31T10:00"), retour: d("2026-03-31T10:00") });
    expect([p.unites, p.joursSupplementaires, p.montantBaseCentimes]).toEqual([2, 0, 180000]);
  });
  it("dernier mois entamé au prorata (÷ 30)", () => {
    const p = calculerPrixLocation({ ...base, depart: d("2026-10-01T10:00"), retour: d("2026-12-11T10:00") });
    expect([p.unites, p.joursSupplementaires]).toEqual([2, 10]);
    expect(p.montantBaseCentimes).toBe(180000 + 30000);
  });
  it("km inclus mensuels au prorata", () => {
    const duree = decomposerDuree("MENSUELLE", d("2026-10-01T10:00"), d("2026-12-11T10:00"), 60);
    expect(kmInclusTotal("MENSUELLE", 1500, duree)).toBe(3500);
    expect(kmInclusTotal("JOURNALIERE", 200, { unites: 3, joursSupplementaires: 0, joursTotal: 3 })).toBe(600);
    expect(kmInclusTotal("JOURNALIERE", null, { unites: 3, joursSupplementaires: 0, joursTotal: 3 })).toBeNull();
  });
});

describe("km supplémentaires et disponibilité", () => {
  it("km sup = max(0, parcourus − inclus) × prix", () => {
    expect(montantKmSupplementaires(750, 600, 25)).toEqual({ kmSup: 150, montantCentimes: 3750 });
    expect(montantKmSupplementaires(500, 600, 25)).toEqual({ kmSup: 0, montantCentimes: 0 });
    expect(montantKmSupplementaires(5000, null, 25)).toEqual({ kmSup: 0, montantCentimes: 0 }); // illimité
  });
  it("chevauchement de périodes [début, fin[", () => {
    expect(chevauche(d("2026-10-01T09:00"), d("2026-10-05T09:00"), d("2026-10-04T09:00"), d("2026-10-08T09:00"))).toBe(true);
    // Retour à 9 h, départ suivant à 9 h : pas de chevauchement
    expect(chevauche(d("2026-10-01T09:00"), d("2026-10-05T09:00"), d("2026-10-05T09:00"), d("2026-10-08T09:00"))).toBe(false);
  });
  it("taux d'occupation (immobilisations exclues, périodes fusionnées)", () => {
    const t = tauxOccupation({
      debut: d("2026-10-01T00:00"), fin: d("2026-10-31T00:00"),
      locations: [
        { debut: d("2026-10-01T00:00"), fin: d("2026-10-11T00:00") },
        { debut: d("2026-10-06T00:00"), fin: d("2026-10-13T00:00") }, // chevauche la précédente
      ],
      immobilisations: [{ debut: d("2026-10-21T00:00"), fin: d("2026-10-31T00:00") }],
    });
    expect(t).toEqual({ joursLoues: 12, joursDisponibles: 20, tauxBp: 6000 });
  });
});
