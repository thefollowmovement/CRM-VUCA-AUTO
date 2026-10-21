import { describe, expect, it } from "vitest";
import { budgetsAccueil, decouperTitre, elementsBandeau, prixDepart } from "./accueil";

const e = (euros: number[]) => euros.map((x) => x * 100);

describe("accueil du site", () => {
  it("budgets : paliers utiles seulement (au moins une voiture, pas toutes)", () => {
    expect(budgetsAccueil(e([7990, 9490, 13990, 16490, 17990]))).toEqual([8000, 12000, 15000]);
    expect(budgetsAccueil([...e([7990, 9490, 13990, 16490, 17990]), null])).toEqual([8000, 12000, 15000]);
    expect(budgetsAccueil(e([9000]))).toEqual([]);
    expect(budgetsAccueil(e([9000, 9500]))).toEqual([]); // un seul palier contiendrait tout ou rien
    expect(budgetsAccueil(e([4000, 9000]))).toEqual([5000, 8000]);
    expect(budgetsAccueil(e([4000, 60000]))).toEqual([5000, 20000, 50000]);
  });

  it("prix de départ", () => {
    expect(prixDepart(e([12000, 7990, 15000]))).toBe(799000);
    expect(prixDepart([null])).toBeNull();
  });

  it("bandeau : des faits, sans doublon, au moins 3 éléments", () => {
    expect(elementsBandeau([{ titre: "Véhicules contrôlés" }], "Réponse en journée")).toEqual(["Prix affichés, sans surprise", "Véhicules contrôlés", "Réponse en journée"]);
    expect(elementsBandeau([], null)).toHaveLength(3);
    expect(elementsBandeau([{ titre: "Prix affichés, sans surprise" }], null)).toHaveLength(3);
  });

  it("titre en deux temps", () => {
    expect(decouperTitre("Petits prix. Grandes occasions.")).toEqual(["Petits prix.", "Grandes occasions."]);
    expect(decouperTitre("Des voitures choisies avec soin")).toEqual(["Des voitures choisies avec soin", null]);
  });
});
