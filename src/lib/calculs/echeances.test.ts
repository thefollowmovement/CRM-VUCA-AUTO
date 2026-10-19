import { describe, expect, it } from "vitest";
import { etatEcheanceDate, etatEcheanceKm, plusUrgent } from "./echeances";

const auj = new Date("2026-10-19T10:00:00Z");
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("etatEcheanceDate", () => {
  it("dépassée, aujourd'hui, proche, à jour, inconnue", () => {
    expect(etatEcheanceDate(d("2026-10-10"), auj, 30)).toEqual({ niveau: "depassee", texte: "Dépassée de 9 jours" });
    expect(etatEcheanceDate(d("2026-10-19"), auj, 30).niveau).toBe("proche");
    expect(etatEcheanceDate(d("2026-11-18"), auj, 30)).toEqual({ niveau: "proche", texte: "Dans 30 jours" });
    expect(etatEcheanceDate(d("2026-11-19"), auj, 30).niveau).toBe("ok");
    expect(etatEcheanceDate(null, auj, 30).niveau).toBe("inconnue");
  });
});

describe("etatEcheanceKm", () => {
  it("selon le kilométrage restant", () => {
    expect(etatEcheanceKm(60000, 61000, 1000).niveau).toBe("depassee");
    expect(etatEcheanceKm(60000, 59200, 1000).texte).toMatch(/^Dans 800 km$/);
    expect(etatEcheanceKm(60000, 50000, 1000).niveau).toBe("ok");
    expect(etatEcheanceKm(60000, null, 1000).niveau).toBe("inconnue");
  });
  it("garde le plus urgent", () => {
    expect(plusUrgent(etatEcheanceKm(60000, 50000, 1000), etatEcheanceDate(d("2026-10-01"), auj, 30)).niveau).toBe("depassee");
  });
});
