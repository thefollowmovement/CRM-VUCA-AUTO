import { describe, expect, it } from "vitest";
import { celluleCsv, genererCsv, montantCsv } from "./csv";

describe("CSV", () => {
  it("échappe les cellules", () => {
    expect(celluleCsv('Peugeot "208"; Allure')).toBe('"Peugeot ""208""; Allure"');
    expect(celluleCsv(null)).toBe("");
  });
  it("montants à la française", () => {
    expect(montantCsv(123456)).toBe("1234,56");
    expect(montantCsv(-33000)).toBe("-330,00");
  });
  it("BOM + point-virgule", () => {
    expect(genererCsv(["a", "b"], [[1, "x"]])).toBe("﻿a;b\r\n1;x");
  });
});
