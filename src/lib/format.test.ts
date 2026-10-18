import { describe, expect, it } from "vitest";
import {
  centimesVersSaisie,
  dateCalendaireDepuisISO,
  dateCalendaireVersISO,
  formatDate,
  formatDateHeure,
  formatEuros,
  formatPourcentageBp,
  masquerIban,
  parseEurosEnCentimes,
} from "./format";

// Intl utilise des espaces insécables : on les remplace pour comparer.
const espaces = (s: string) => s.replace(/[  ]/g, " ");

describe("formatEuros", () => {
  it("affiche au format français", () => {
    expect(espaces(formatEuros(123456))).toBe("1 234,56 €");
    expect(espaces(formatEuros(800000))).toBe("8 000,00 €");
    expect(espaces(formatEuros(0))).toBe("0,00 €");
    expect(espaces(formatEuros(-33000))).toBe("-330,00 €");
  });
  it("affiche un tiret si absent", () => {
    expect(formatEuros(null)).toBe("—");
  });
});

describe("parseEurosEnCentimes", () => {
  it.each([
    ["1 234,56", 123456],
    ["1234.56", 123456],
    ["1.234,56", 123456],
    ["12,5", 1250],
    ["800 €", 80000],
    ["0,07", 7],
    ["11500", 1150000],
    ["-330", -33000],
    ["1 234,56 €", 123456],
  ])("« %s » → %i centimes", (saisie, attendu) => {
    expect(parseEurosEnCentimes(saisie)).toBe(attendu);
  });
  it.each(["", "abc", "12,345", "1,2,3", "--5"])("refuse « %s »", (saisie) => {
    expect(parseEurosEnCentimes(saisie)).toBeNull();
  });
  it("aller-retour avec centimesVersSaisie", () => {
    for (const c of [0, 7, 1250, 123456, -33000]) {
      expect(parseEurosEnCentimes(centimesVersSaisie(c))).toBe(c);
    }
  });
});

describe("formatPourcentageBp", () => {
  it("convertit les points de base", () => {
    expect(espaces(formatPourcentageBp(3667))).toBe("36,67 %");
    expect(espaces(formatPourcentageBp(2000))).toBe("20 %");
    expect(espaces(formatPourcentageBp(10000))).toBe("100 %");
  });
});

describe("dates", () => {
  it("formate en JJ/MM/AAAA à l'heure de Paris", () => {
    // 23h30 UTC le 31/12 = déjà le 01/01 à Paris
    expect(formatDate(new Date("2026-12-31T23:30:00Z"))).toBe("01/01/2027");
    expect(formatDateHeure(new Date("2026-10-18T13:42:00Z"))).toBe("18/10/2026 15:42");
  });
  it("gère les dates calendaires (colonnes @db.Date)", () => {
    const d = dateCalendaireDepuisISO("2026-03-15");
    expect(d?.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    expect(formatDate(d)).toBe("15/03/2026");
    expect(dateCalendaireVersISO(d)).toBe("2026-03-15");
    expect(dateCalendaireDepuisISO("15/03/2026")).toBeNull();
  });
});

describe("masquerIban", () => {
  it("ne montre que le début et la fin", () => {
    expect(masquerIban("FR76 3000 6000 0112 3456 7890 189")).toBe("FR76 •••• •••• •••• 0189");
    expect(masquerIban(null)).toBe("—");
  });
});
