import { describe, expect, it } from "vitest";
import { bornesPeriode, derniersMois, joursPeriode, resultatPeriode, type VehiculePeriode } from "./periode";

// Peugeot 208 de référence : achetée 8 000 €, 300 € + 700 € de dépenses, vendue 11 500 € le 10/05
const p208: VehiculePeriode = {
  typeExploitation: "ACHAT_REVENTE",
  prixAchatCentimes: 800000,
  prixVenteCentimes: 1150000,
  dateVente: "2026-05-10",
  depenses: [{ date: "2026-04-02", montantCentimes: 30000 }, { date: "2026-04-20", montantCentimes: 70000 }],
  revenus: [],
};

// Véhicule de location : acheté 10 000 €, 500 € de charges en mars, loyers 800 € (mars) et 900 € (avril), revendu 9 000 € en juin
const loc: VehiculePeriode = {
  typeExploitation: "LOCATION",
  prixAchatCentimes: 1000000,
  prixVenteCentimes: 900000,
  dateVente: "2026-06-15",
  depenses: [{ date: "2026-03-05", montantCentimes: 50000 }],
  revenus: [{ date: "2026-03-31", montantCentimes: 80000 }, { date: "2026-04-01", montantCentimes: 90000 }],
};

describe("résultat d'une période", () => {
  it("achat-revente : tout le bénéfice le mois de la vente, rien avant", () => {
    expect(resultatPeriode(p208, "2026-04-01", "2026-04-30").totalCentimes).toBe(0);
    const mai = resultatPeriode(p208, "2026-05-01", "2026-05-31");
    expect(mai).toMatchObject({ vendu: true, caVenteCentimes: 1150000, beneficeVenteCentimes: 250000, totalCentimes: 250000 });
  });
  it("location : charges et loyers à leur date, vente = prix de vente − prix d'achat", () => {
    expect(resultatPeriode(loc, "2026-03-01", "2026-03-31")).toMatchObject({ revenusLocationCentimes: 80000, chargesLocationCentimes: 50000, totalCentimes: 30000 });
    expect(resultatPeriode(loc, "2026-04-01", "2026-04-30").totalCentimes).toBe(90000);
    expect(resultatPeriode(loc, "2026-06-01", "2026-06-30")).toMatchObject({ beneficeVenteCentimes: -100000, totalCentimes: -100000 });
  });
  it("la somme des périodes = le bénéfice global du véhicule (5.1 / 5.4)", () => {
    const mois = ["03", "04", "05", "06"].map((m) => resultatPeriode(loc, `2026-${m}-01`, `2026-${m}-31`).totalCentimes);
    // 9 000 + 1 700 − (10 000 + 500) = 200 €
    expect(mois.reduce((a, b) => a + b, 0)).toBe(20000);
    expect(resultatPeriode(loc, "2026-01-01", "2026-12-31").totalCentimes).toBe(20000);
    expect(resultatPeriode(p208, "2026-01-01", "2026-12-31").totalCentimes).toBe(250000);
  });
  it("véhicule non vendu : pas de bénéfice de vente", () => {
    const r = resultatPeriode({ ...p208, prixVenteCentimes: null, dateVente: null }, "2026-01-01", "2026-12-31");
    expect(r).toMatchObject({ vendu: false, caVenteCentimes: 0, totalCentimes: 0 });
  });
});

describe("périodes", () => {
  it("bornes des périodes prédéfinies", () => {
    expect(bornesPeriode("mois", "2026-10-20")).toEqual({ du: "2026-10-01", au: "2026-10-31" });
    expect(bornesPeriode("mois-dernier", "2026-01-15")).toEqual({ du: "2025-12-01", au: "2025-12-31" });
    expect(bornesPeriode("trimestre", "2026-10-20")).toEqual({ du: "2026-10-01", au: "2026-12-31" });
    expect(bornesPeriode("trimestre", "2026-02-28")).toEqual({ du: "2026-01-01", au: "2026-03-31" });
    expect(bornesPeriode("annee", "2026-10-20")).toEqual({ du: "2026-01-01", au: "2026-12-31" });
    expect(bornesPeriode("mois-dernier", "2028-03-10")).toEqual({ du: "2028-02-01", au: "2028-02-29" });
  });
  it("période personnalisée (invalide → ce mois)", () => {
    expect(bornesPeriode("perso", "2026-10-20", "2026-02-01", "2026-03-15")).toEqual({ du: "2026-02-01", au: "2026-03-15" });
    expect(bornesPeriode("perso", "2026-10-20", "2026-05-01", "2026-03-15")).toEqual({ du: "2026-10-01", au: "2026-10-31" });
  });
  it("12 derniers mois et nombre de jours", () => {
    const m = derniersMois("2026-02-10", 12);
    expect(m[0]).toEqual({ cle: "2025-03", du: "2025-03-01", au: "2025-03-31" });
    expect(m[11]!.cle).toBe("2026-02");
    expect(joursPeriode("2026-10-01", "2026-10-31")).toBe(31);
  });
});
