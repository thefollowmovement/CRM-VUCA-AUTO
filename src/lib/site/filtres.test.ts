import { describe, expect, it } from "vitest";
import { appliquerFiltres, ecrireFiltres, etiquettesFiltres, FILTRES_VIDES, lireFiltres, optionsFiltres, type VehiculeFiltrable } from "./filtres";

const v = (marque: string, prix: number | null, km: number | null, annee: number | null, carburant = "Essence", boite = "Manuelle"): VehiculeFiltrable & { id: string } => ({
  id: `${marque}-${prix}`,
  marque,
  prixCentimes: prix === null ? null : prix * 100,
  kilometrage: km,
  annee,
  carburant,
  boite,
});
// Ordre d'entrée = plus récentes d'abord
const LISTE = [
  v("Peugeot", 11500, 64000, 2020),
  v("Toyota", 16490, 76000, 2018, "Hybride", "Automatique"),
  v("Renault", 7990, 48000, 2019),
  v("Peugeot", 17990, 52000, 2020, "Essence", "Automatique"),
  v("Dacia", null, null, null, "Diesel"),
];
const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe("filtres de la liste", () => {
  it("lecture de l'adresse : valeurs invalides ignorées", () => {
    expect(lireFiltres(new URLSearchParams("marque=Peugeot&prix=15000&km=abc&annee=1800&tri=hasard"))).toEqual({ ...FILTRES_VIDES, marque: "Peugeot", prixMax: 15000 });
    expect(lireFiltres({ boite: ["Automatique", "Manuelle"], tri: "km", annee: "2019" })).toEqual({ ...FILTRES_VIDES, boite: "Automatique", tri: "km", anneeMin: 2019 });
    expect(lireFiltres({})).toEqual(FILTRES_VIDES);
  });

  it("écriture : aller-retour, valeurs par défaut omises", () => {
    const f = { ...FILTRES_VIDES, marque: "Citroën", prixMax: 12000, boite: "Automatique", tri: "prix-asc" as const };
    const texte = ecrireFiltres(f);
    expect(texte).toBe("?marque=Citro%C3%ABn&prix=12000&boite=Automatique&tri=prix-asc");
    expect(lireFiltres(new URLSearchParams(texte))).toEqual(f);
    expect(ecrireFiltres(FILTRES_VIDES)).toBe("");
  });

  it("filtres combinés (marque sans tenir compte des majuscules ni des accents)", () => {
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, marque: "peugeot" }))).toEqual(["Peugeot-11500", "Peugeot-17990"]);
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, prixMax: 12000 }))).toEqual(["Peugeot-11500", "Renault-7990"]); // prix sur demande exclu
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, kmMax: 60000, anneeMin: 2019 }))).toEqual(["Renault-7990", "Peugeot-17990"]);
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, boite: "automatique", carburant: "Hybride" }))).toEqual(["Toyota-16490"]);
    expect(appliquerFiltres(LISTE, { ...FILTRES_VIDES, marque: "Ferrari" })).toEqual([]);
  });

  it("tris : prix et kilométrage, valeurs absentes en fin de liste", () => {
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, tri: "prix-asc" }))).toEqual(["Renault-7990", "Peugeot-11500", "Toyota-16490", "Peugeot-17990", "Dacia-null"]);
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, tri: "prix-desc" }))).toEqual(["Peugeot-17990", "Toyota-16490", "Peugeot-11500", "Renault-7990", "Dacia-null"]);
    expect(ids(appliquerFiltres(LISTE, { ...FILTRES_VIDES, tri: "km" }))[0]).toBe("Renault-7990");
    expect(ids(appliquerFiltres(LISTE, FILTRES_VIDES))).toEqual(ids(LISTE));
  });

  it("options proposées et étiquettes des filtres actifs", () => {
    const o = optionsFiltres(LISTE);
    expect(o.marques).toEqual(["Dacia", "Peugeot", "Renault", "Toyota"]);
    expect(o.carburants).toEqual(["Diesel", "Essence", "Hybride"]);
    expect(o.annees).toEqual([2020, 2019, 2018]);
    const e = etiquettesFiltres({ ...FILTRES_VIDES, prixMax: 15000, kmMax: 100000, anneeMin: 2019, boite: "Automatique" }).map((x) => x.libelle.replace(/[\s  ]/g, " "));
    expect(e).toEqual(["Jusqu'à 15 000 €", "Jusqu'à 100 000 km", "Depuis 2019", "Automatique"]);
  });
});
