import { describe, expect, it } from "vitest";
import { CLIENTS_DEMO, INVESTISSEURS_DEMO, VEHICULES } from "../../prisma/seed/demo";
import { vehiculesSite } from "../../prisma/seed/demo-site";
import { estClientDemo, estInvestisseurDemo, estVehiculeDemo, horairesDemo, maxNumeroAnnuel, maxReferenceAnnonce, moyensPaiementDemo, VEHICULES_DEMO } from "./demo";

describe("reconnaissance des données de démo", () => {
  it("suit exactement les véhicules, clients et investisseurs du seed", () => {
    const seed = [...VEHICULES, ...vehiculesSite()].map((d) => d.donnees);
    expect(
      seed.every((v) =>
        estVehiculeDemo({
          immatriculation: v.immatriculation ?? null,
          marque: v.marque,
          modele: v.modele,
        }),
      ),
    ).toBe(true);
    expect(Object.keys(VEHICULES_DEMO).length).toBe(seed.length);
    expect(
      CLIENTS_DEMO.every((c) =>
        estClientDemo({
          nom: c.nom,
          prenom: c.prenom ?? null,
          numeroPermis: c.numeroPermis ?? null,
        }),
      ),
    ).toBe(true);
    expect(
      INVESTISSEURS_DEMO.every((p) =>
        estInvestisseurDemo({
          nom: p.nom,
          email: p.email,
          type: "INVESTISSEUR",
          estSysteme: false,
        }),
      ),
    ).toBe(true);
  });

  it("ne reconnaît jamais une vraie fiche qui ressemble à la démo", () => {
    // Même immatriculation mais autre modèle (saisie réelle)
    expect(
      estVehiculeDemo({
        immatriculation: "FG-208-PA",
        marque: "Renault",
        modele: "Clio",
      }),
    ).toBe(false);
    expect(
      estVehiculeDemo({
        immatriculation: "AB-123-CD",
        marque: "Peugeot",
        modele: "208",
      }),
    ).toBe(false);
    expect(
      estVehiculeDemo({
        immatriculation: null,
        marque: "Peugeot",
        modele: "208",
      }),
    ).toBe(false);
    // Homonyme sans le même email / permis
    expect(
      estInvestisseurDemo({
        nom: "Karim Benali",
        email: "karim@gmail.com",
        type: "INVESTISSEUR",
        estSysteme: false,
      }),
    ).toBe(false);
    expect(
      estInvestisseurDemo({
        nom: "VUCA AUTO",
        email: null,
        type: "SOCIETE",
        estSysteme: true,
      }),
    ).toBe(false);
    expect(estClientDemo({ nom: "Moreau", prenom: "Lucas", numeroPermis: "999" })).toBe(false);
    // Casse et espaces tolérés
    expect(
      estVehiculeDemo({
        immatriculation: "FG-208-PA",
        marque: " peugeot",
        modele: "208 ",
      }),
    ).toBe(true);
  });

  it("réglages du site : seules les valeurs de la démo sont reconnues", () => {
    const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const demo = jours.map((jour, i) => ({
      jour,
      ouvert: i < 6,
      plages: i < 5 ? "9h – 12h, 14h – 19h" : i === 5 ? "10h – 17h" : "",
    }));
    expect(horairesDemo(demo)).toBe(true);
    expect(horairesDemo(demo.map((h, i) => (i === 0 ? { ...h, plages: "8h – 18h" } : h)))).toBe(false);
    expect(horairesDemo(null)).toBe(false);
    expect(moyensPaiementDemo(["Virement bancaire", "Chèque de banque"])).toBe(true);
    expect(moyensPaiementDemo(["Virement bancaire", "Chèque de banque", "Espèces (dans la limite légale)"])).toBe(false);
  });

  it("compteurs : le prochain numéro suit le plus grand numéro restant", () => {
    expect(maxNumeroAnnuel(["LOC-2026-0003", "LOC-2026-0012", "LOC-2025-0040", null], 2026)).toBe(12);
    expect(maxNumeroAnnuel(["LOC-2025-0040"], 2026)).toBe(0);
    expect(maxNumeroAnnuel(["FAC-2026-0002"], 2026)).toBe(2);
    expect(maxReferenceAnnonce(["VA-0001", "VA-0014", "VA-0003"])).toBe(14);
    expect(maxReferenceAnnonce([])).toBe(0);
  });
});
