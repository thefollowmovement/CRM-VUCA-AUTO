import { describe, expect, it } from "vitest";
import { champsLegauxManquants, modeleConfidentialite, modeleMentionsLegales, type EntreeLegal } from "./legal";
import { decouperTexteRiche } from "./texte-riche";

const complet: EntreeLegal = {
  nomAffiche: "VUCA AUTO",
  formeJuridique: "SAS",
  siret: "12345678900012",
  adresseSiege: "1 rue de la Paix, 75002 Paris",
  email: "contact@vuca-auto.fr",
  telephone: null,
  domaine: "vuca-auto.fr",
  plausible: false,
  googleAnalytics: false,
};

describe("modèles légaux", () => {
  it("mentions complètes, SIRET lisible, hébergeur", () => {
    const t = modeleMentionsLegales(complet);
    expect(t).toContain("123 456 789 00012");
    expect(t).toContain("Hostinger International Ltd");
    expect(t).toContain("vuca-auto.fr");
    expect(t).not.toContain("à compléter");
    expect(champsLegauxManquants(complet)).toEqual([]);
  });

  it("signale les informations manquantes", () => {
    const vide = { ...complet, siret: null, formeJuridique: null, adresseSiege: null, email: null };
    expect(champsLegauxManquants(vide)).toEqual(["forme juridique", "SIRET", "adresse du siège", "email ou téléphone"]);
    expect(modeleMentionsLegales(vide)).toContain("[à compléter : SIRET]");
  });

  it("confidentialité : cookies selon les outils de mesure", () => {
    expect(modeleConfidentialite(complet)).toContain("Le site ne dépose aucun cookie.");
    const ga = modeleConfidentialite({ ...complet, googleAnalytics: true, plausible: true });
    expect(ga).toContain("Google Analytics");
    expect(ga).toContain("Plausible");
    expect(ga).not.toContain("Le site ne dépose aucun cookie.");
  });

  it("les modèles se découpent en blocs lisibles (gras, listes)", () => {
    const blocs = decouperTexteRiche(modeleMentionsLegales(complet), 20000);
    expect(blocs.some((b) => b.type === "liste")).toBe(true);
    expect(blocs[0]?.type === "paragraphe" && blocs[0].lignes[0]?.[0]?.gras).toBe(true);
  });
});
