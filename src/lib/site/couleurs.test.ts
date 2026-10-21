import { describe, expect, it } from "vitest";
import { accentLisible, accentLisibleSurBlanc, accentValide, contraste, FOND_TEXTE_CLAIR, FOND_TEXTE_SOMBRE, hexVersRvb, texteSurCouleur, variablesAccent } from "./couleurs";

describe("couleurs du site", () => {
  it("contrastes de référence", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contraste("#6e6e73", "#ffffff")).toBeGreaterThanOrEqual(4.5); // texte secondaire
    expect(contraste("#6e6e73", "#f5f5f7")).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#052e16", "#25d366")).toBeGreaterThanOrEqual(4.5); // texte des boutons WhatsApp
    expect(contraste("#ffffff", "#25d366")).toBeLessThan(4.5); // d'où le texte foncé
    expect(contraste("#9a4a00", "#fff1e0")).toBeGreaterThanOrEqual(4.5); // badge Réservé
    expect(contraste("#515154", "#e8e8ed")).toBeGreaterThanOrEqual(4.5); // badge Vendu
    expect(contraste("#ffb066", "#3a2410")).toBeGreaterThanOrEqual(4.5); // Réservé (sombre)
    expect(contraste("#a1a1a6", "#1c1c1e")).toBeGreaterThanOrEqual(4.5); // texte secondaire (sombre)
  });

  it("texte sur l'accent et accent par défaut", () => {
    expect(texteSurCouleur("#0071E3")).toBe("#ffffff");
    expect(texteSurCouleur("#FFD60A")).toBe("#1d1d1f");
    expect(accentLisibleSurBlanc("#0071E3")).toBe(true);
    expect(accentLisibleSurBlanc("#FFD60A")).toBe(false);
    expect(accentValide("bleu")).toBe("#FFD60A");
    expect(hexVersRvb("#0071e3")).toEqual([0, 113, 227]);
  });

  it("accent ajusté pour rester lisible en texte (clair et sombre)", () => {
    for (const a of ["#0071E3", "#FFD60A", "#34C759", "#AF52DE", "#000000", "#ffffff", "#ff3b30"]) {
      expect(contraste(accentLisible(a, FOND_TEXTE_CLAIR), FOND_TEXTE_CLAIR)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(accentLisible(a, FOND_TEXTE_SOMBRE), FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
    }
    // Déjà lisible : inchangé
    expect(accentLisible("#1d1d1f", FOND_TEXTE_CLAIR)).toBe("#1d1d1f");
    const v = variablesAccent("#0071E3");
    expect(v["--site-sur-accent-base"]).toBe("#ffffff");
    expect(v["--site-accent-texte-clair"]).not.toBe("#0071e3"); // 3,8:1 sur le gris « Vendu » → assombri
  });
});
