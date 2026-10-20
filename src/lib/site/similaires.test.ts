import { describe, expect, it } from "vitest";
import { vehiculesSimilaires } from "./similaires";

const v = (slug: string, prix: number | null, carburant = "Essence", marque = "Peugeot") => ({ slug, marque, carburant, prixCentimes: prix === null ? null : prix * 100 });

describe("véhicules similaires", () => {
  const liste = [v("a", 12000), v("b", 25000), v("c", 12500, "Diesel"), v("d", 11000, "Essence", "Renault"), v("e", null), v("ref", 12000)];
  it("gamme de prix d'abord, sans la fiche elle-même", () => {
    expect(vehiculesSimilaires(v("ref", 12000), liste).map((x) => x.slug)).toEqual(["a", "d", "c"]);
  });
  it("prix sur demande : ordre d'origine, moins de résultats si la liste est courte", () => {
    expect(vehiculesSimilaires(v("ref", null), [v("x", 9000), v("y", 9500)], 3).map((x) => x.slug)).toEqual(["x", "y"]);
  });
});
