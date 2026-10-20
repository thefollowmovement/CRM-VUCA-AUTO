import { describe, expect, it } from "vitest";
import { agregerStatistiques, decalerJour, evolution, joursPeriode, lirePeriodeStat, tauxContact, type LigneStat } from "./statistiques";

describe("statistiques du site", () => {
  it("jours de la période (changement de mois et d'heure compris)", () => {
    expect(decalerJour("2026-11-01", -1)).toBe("2026-10-31");
    expect(joursPeriode("2026-10-26", 3)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(lirePeriodeStat("90")).toBe(90);
    expect(lirePeriodeStat("12")).toBe(30);
  });

  it("totaux, jours sans visite à zéro, période précédente et détail par annonce", () => {
    const l: LigneStat[] = [
      { jour: "2026-10-20", type: "VUE_SITE", annonceId: null, compte: 10 },
      { jour: "2026-10-20", type: "VUE_ANNONCE", annonceId: "a", compte: 6 },
      { jour: "2026-10-19", type: "VUE_ANNONCE", annonceId: "b", compte: 4 },
      { jour: "2026-10-18", type: "CLIC_WHATSAPP", annonceId: "a", compte: 2 },
      { jour: "2026-10-18", type: "CLIC_APPEL", annonceId: null, compte: 1 },
      { jour: "2026-10-16", type: "VUE_SITE", annonceId: null, compte: 5 }, // période précédente
      { jour: "2026-10-10", type: "VUE_SITE", annonceId: null, compte: 99 }, // hors des deux périodes
    ];
    const s = agregerStatistiques(l, "2026-10-20", 3);
    expect(s.jours.map((j) => j.jour)).toEqual(["2026-10-18", "2026-10-19", "2026-10-20"]);
    expect(s.jours[0]).toEqual({ jour: "2026-10-18", VUE_SITE: 0, VUE_ANNONCE: 0, CLIC_WHATSAPP: 2, CLIC_APPEL: 1 });
    expect(s.totaux).toEqual({ VUE_SITE: 10, VUE_ANNONCE: 10, CLIC_WHATSAPP: 2, CLIC_APPEL: 1 });
    expect(s.precedents.VUE_SITE).toBe(5);
    expect(s.parAnnonce.get("a")).toEqual({ VUE_SITE: 0, VUE_ANNONCE: 6, CLIC_WHATSAPP: 2, CLIC_APPEL: 0 });
    expect(s.parAnnonce.get("b")?.VUE_ANNONCE).toBe(4);
  });

  it("taux de contact et évolution", () => {
    expect(tauxContact(3, 40)).toBe(7.5);
    expect(tauxContact(1, 0)).toBeNull();
    expect(evolution(15, 10)).toBe(50);
    expect(evolution(5, 10)).toBe(-50);
    expect(evolution(5, 0)).toBeNull();
  });
});
