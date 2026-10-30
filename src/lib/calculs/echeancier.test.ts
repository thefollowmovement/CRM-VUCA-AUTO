import { describe, expect, it } from "vitest";
import { saisieParisVersDate } from "@/lib/dates";
import { genererEcheancier, imputerPaiements, joursRetardEcheance } from "./echeancier";

const d = (s: string) => saisieParisVersDate(s)!;
const base = { tarifCentimes: 90000, acompteCentimes: null, jourEcheanceMensuelle: 5, creeLe: d("2026-09-20T10:00") };

describe("échéancier", () => {
  it("mensuel : une échéance par mois, 1re au départ, suivantes le jour choisi", () => {
    const e = genererEcheancier({ ...base, type: "MENSUELLE", departPrevuLe: d("2026-10-01T10:00"), retourPrevuLe: d("2027-01-01T10:00"), dureeFacturee: 3, joursSupplementaires: 0, prixTotalCentimes: 270000 });
    expect(e.map((x) => [x.dateEcheance, x.montantCentimes])).toEqual([["2026-10-01", 90000], ["2026-11-05", 90000], ["2026-12-05", 90000]]);
    expect(e[0]!.libelle).toBe("Loyer octobre 2026 (du 01/10 au 31/10)");
    expect(e[2]!.periodeFin).toBe("2026-12-31");
  });
  it("mensuel : départ après le jour d'échéance → échéance le mois suivant, jamais avant la période", () => {
    const e = genererEcheancier({ ...base, type: "MENSUELLE", departPrevuLe: d("2026-09-29T10:00"), retourPrevuLe: d("2026-12-29T10:00"), dureeFacturee: 3, joursSupplementaires: 0, prixTotalCentimes: 270000 });
    expect(e.map((x) => x.dateEcheance)).toEqual(["2026-09-29", "2026-11-05", "2026-12-05"]);
    const fin = genererEcheancier({ ...base, type: "MENSUELLE", departPrevuLe: d("2026-11-20T10:00"), retourPrevuLe: d("2027-01-20T10:00"), dureeFacturee: 2, joursSupplementaires: 0, prixTotalCentimes: 180000 });
    expect(fin.map((x) => x.dateEcheance)).toEqual(["2026-11-20", "2027-01-05"]);
  });
  it("mensuel avec dernier mois au prorata et options sur la 1re échéance", () => {
    // 2 mois + 10 jours = 1 800 + 300 ; + options 50 € − remise 20 € → total 2 130 €
    const e = genererEcheancier({ ...base, type: "MENSUELLE", departPrevuLe: d("2026-10-01T10:00"), retourPrevuLe: d("2026-12-11T10:00"), dureeFacturee: 2, joursSupplementaires: 10, prixTotalCentimes: 213000 });
    expect(e.map((x) => x.montantCentimes)).toEqual([93000, 90000, 30000]);
    expect(e.reduce((a, x) => a + x.montantCentimes, 0)).toBe(213000);
    expect(e[2]!.libelle).toBe("Loyer au prorata décembre 2026 (du 01/12 au 10/12)");
  });
  it("courte durée : acompte + solde, ou une seule échéance", () => {
    const court = { ...base, type: "JOURNALIERE" as const, departPrevuLe: d("2026-10-10T09:00"), retourPrevuLe: d("2026-10-13T09:00"), dureeFacturee: 3, joursSupplementaires: 0, prixTotalCentimes: 14700 };
    expect(genererEcheancier({ ...court, acompteCentimes: 5000 }).map((x) => [x.libelle, x.dateEcheance, x.montantCentimes])).toEqual([
      ["Acompte", "2026-09-20", 5000],
      ["Solde", "2026-10-10", 9700],
    ]);
    expect(genererEcheancier(court).map((x) => [x.libelle, x.montantCentimes])).toEqual([["Location", 14700]]);
  });
});

describe("imputation des paiements", () => {
  const ech = [{ id: "e1", montantCentimes: 90000 }, { id: "e2", montantCentimes: 90000 }, { id: "e3", montantCentimes: 90000 }];
  it("paiements partiels, dans l'ordre des échéances", () => {
    const r = imputerPaiements(ech, [{ id: "p1", montantCentimes: 90000 }, { id: "p2", montantCentimes: 50000 }]);
    expect(r.echeances.map((e) => [e.statut, e.payeCentimes])).toEqual([["PAYEE", 90000], ["PARTIELLE", 50000], ["A_VENIR", 0]]);
    expect(r.paiements).toEqual([{ id: "p1", echeanceId: "e1" }, { id: "p2", echeanceId: "e2" }]);
  });
  it("un paiement qui couvre plusieurs échéances, trop-perçu", () => {
    const r = imputerPaiements(ech, [{ id: "p1", montantCentimes: 300000 }]);
    expect(r.echeances.every((e) => e.statut === "PAYEE")).toBe(true);
    expect(r.tropPercuCentimes).toBe(30000);
  });
  it("jours de retard", () => {
    expect(joursRetardEcheance("2026-10-05", "PARTIELLE", "2026-10-19")).toBe(14);
    expect(joursRetardEcheance("2026-10-05", "PAYEE", "2026-10-19")).toBe(0);
    expect(joursRetardEcheance("2026-11-05", "A_VENIR", "2026-10-19")).toBe(0);
  });
});
