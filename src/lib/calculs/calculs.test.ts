import { describe, expect, it } from "vitest";
import { normaliserImmatriculation, normaliserVin } from "../vehicule";
import { pourcentagesBp, repartirProportionnellement } from "./argent";
import { partenairesEnDouble, resumerFinancement } from "./financement";
import { coutDeRevient, joursEnStock, margePrevisionnelle } from "./vehicule";

describe("repartirProportionnellement", () => {
  it("la somme tombe toujours juste", () => {
    expect(repartirProportionnellement(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(repartirProportionnellement(1000000, [300000, 500000])).toEqual([375000, 625000]);
    const parts = repartirProportionnellement(250000, [330000, 570000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(250000);
  });
  it("gère les montants négatifs (pertes)", () => {
    expect(repartirProportionnellement(-90000, [330000, 570000])).toEqual([-33000, -57000]);
  });
  it("poids nuls", () => {
    expect(repartirProportionnellement(100, [0, 0])).toEqual([0, 0]);
    expect(repartirProportionnellement(100, [])).toEqual([]);
  });
});

describe("pourcentagesBp", () => {
  it("exemple de référence : 3 300 € / 5 700 € → 36,67 % / 63,33 %", () => {
    expect(pourcentagesBp([330000, 570000])).toEqual([3667, 6333]);
  });
  it("trois tiers → 33,34 / 33,33 / 33,33", () => {
    expect(pourcentagesBp([100, 100, 100])).toEqual([3334, 3333, 3333]);
  });
});

describe("resumerFinancement", () => {
  it("Peugeot 208 : 8 000 € financés par VUCA 3 000 € + A 5 000 €", () => {
    const r = resumerFinancement(800000, [
      { partenaireId: "vuca", montantCentimes: 300000 },
      { partenaireId: "a", montantCentimes: 500000 },
    ]);
    expect(r).toEqual({ totalCentimes: 800000, resteCentimes: 0, etat: "complet", pourcentagesBp: [3750, 6250] });
  });
  it("financement incomplet ou dépassé", () => {
    expect(resumerFinancement(800000, [{ partenaireId: "v", montantCentimes: 700000 }]).etat).toBe("incomplet");
    const d = resumerFinancement(800000, [{ partenaireId: "v", montantCentimes: 900000 }]);
    expect(d.etat).toBe("depasse");
    expect(d.resteCentimes).toBe(-100000);
  });
  it("aucune ligne", () => {
    expect(resumerFinancement(500000, [])).toEqual({ totalCentimes: 0, resteCentimes: 500000, etat: "incomplet", pourcentagesBp: [] });
  });
  it("détecte un partenaire en double", () => {
    expect(
      partenairesEnDouble([
        { partenaireId: "a", montantCentimes: 1 },
        { partenaireId: "b", montantCentimes: 1 },
        { partenaireId: "a", montantCentimes: 1 },
      ]),
    ).toEqual(["a"]);
  });
});

describe("indicateurs véhicule", () => {
  it("coût de revient = achat + dépenses", () => {
    expect(coutDeRevient(800000, 100000)).toBe(900000);
  });
  it("jours en stock", () => {
    const achat = new Date("2026-01-10T00:00:00Z");
    expect(joursEnStock(achat, new Date("2026-02-09T00:00:00Z"))).toBe(30);
    expect(joursEnStock(achat, null, new Date("2026-01-10T18:00:00Z"))).toBe(0);
    expect(joursEnStock(achat, null, new Date("2026-03-31T23:30:00Z"))).toBe(80);
  });
  it("marge prévisionnelle : prix cible prioritaire, sinon valeur estimée", () => {
    expect(margePrevisionnelle(900000, 1150000, 1000000)).toBe(250000);
    expect(margePrevisionnelle(900000, null, 1000000)).toBe(100000);
    expect(margePrevisionnelle(900000, null, null)).toBeNull();
  });
});

describe("immatriculation", () => {
  it.each([
    ["ab123cd", "AB-123-CD"],
    ["AB 123 CD", "AB-123-CD"],
    ["ab-123-cd", "AB-123-CD"],
    ["WW-555-ZZ", "WW-555-ZZ"],
    ["1234ab56", "1234 AB 56"],
    ["123 ABC 2A", "123 ABC 2A"],
    ["45-AB-971", "45 AB 971"],
  ])("« %s » → « %s »", (saisie, attendu) => {
    expect(normaliserImmatriculation(saisie)).toBe(attendu);
  });
  it.each(["", "AI-123-CD", "AB-12-CD", "ABC-123-DE", "hello"])("refuse « %s »", (saisie) => {
    expect(normaliserImmatriculation(saisie)).toBeNull();
  });
});

describe("VIN", () => {
  it("accepte 17 caractères sans I/O/Q", () => {
    expect(normaliserVin("vf3 cc8hp0 kt123456")).toBe("VF3CC8HP0KT123456");
    expect(normaliserVin("VF3CC8HP0KT12345")).toBeNull();
    expect(normaliserVin("VF3CC8HP0KT12345O")).toBeNull();
  });
});
