import { describe, expect, it } from "vitest";
import { saisieParisVersDate } from "@/lib/dates";
import { comparerEtatsDesLieux, montantRetenu, tarifJournalierRetard, type ContratComparaison, type ReleveEdl } from "./etat-des-lieux";

const d = (s: string) => saisieParisVersDate(s)!;
const reglages = { toleranceRetardMinutes: 60, fraisNettoyageCentimes: 5000, prixHuitiemeCarburantCentimes: 1500, prixPourcentBatterieCentimes: 50 };
// Location de 3 jours, 200 km/jour inclus, 0,25 €/km sup, 49 €/jour
const contrat: ContratComparaison = {
  type: "JOURNALIERE", tarifCentimes: 4900, tarifJournalierCentimes: null, dureeFacturee: 3, joursSupplementaires: 0,
  kilometrageIllimite: false, kmInclusParUnite: 200, prixKmSupCentimes: 25,
  departPrevuLe: d("2026-10-20T09:00"), retourPrevuLe: d("2026-10-23T09:00"),
};
const depart: ReleveEdl = {
  kilometrage: 40000, niveauCarburantHuitiemes: 8, niveauBatteriePct: null, propreteInterieure: "PROPRE", propreteExterieure: "PROPRE",
  checklist: [{ libelle: "Clés", present: true, quantite: 2 }, { libelle: "Gilet", present: true, quantite: null }, { libelle: "Cric", present: false, quantite: null }],
};

describe("comparaison départ / retour", () => {
  it("retour conforme : aucun frais", () => {
    const c = comparerEtatsDesLieux({ contrat, depart, retour: { ...depart, kilometrage: 40550 }, retourReelLe: d("2026-10-23T09:45"), reglages, nouveauxDommages: [] });
    expect(c.kmParcourus).toBe(550);
    expect(c.kmInclus).toBe(600);
    expect(c.fraisProposes).toEqual([]);
  });

  it("km sup, carburant, retard, nettoyage, dommage, élément manquant", () => {
    const c = comparerEtatsDesLieux({
      contrat,
      depart,
      retour: {
        kilometrage: 40750, niveauCarburantHuitiemes: 5, niveauBatteriePct: null, propreteInterieure: "SALE", propreteExterieure: "CORRECT",
        checklist: [{ libelle: "Clés", present: true, quantite: 1 }, { libelle: "Gilet", present: false, quantite: null }],
      },
      retourReelLe: d("2026-10-24T12:00"), // 27 h de retard → 2 jours (tolérance 60 min)
      reglages,
      nouveauxDommages: [{ id: "dm1", libelle: "rayure — porte avant gauche" }],
    });
    expect(c.kmSupplementaires).toBe(150);
    expect(c.carburantManquantHuitiemes).toBe(3);
    expect([c.retardMinutes, c.joursRetard]).toEqual([27 * 60, 2]);
    expect(c.salete).toBe(true);
    expect(c.elementsManquants).toEqual(["Clés (1 sur 2)", "Gilet"]);
    expect(c.fraisProposes.map((f) => [f.type, f.quantite, f.montantCentimes])).toEqual([
      ["KM_SUPPLEMENTAIRES", 150, 3750],
      ["CARBURANT", 3, 4500],
      ["RETARD", 2, 9800],
      ["NETTOYAGE", 1, 5000],
      ["DOMMAGES", 1, 0],
      ["AUTRE", 1, 0],
      ["AUTRE", 1, 0],
    ]);
    expect(c.fraisProposes[4]?.dommageId).toBe("dm1");
  });

  it("retard dans la tolérance : pas de frais", () => {
    const c = comparerEtatsDesLieux({ contrat, depart, retour: { ...depart, kilometrage: 40100 }, retourReelLe: d("2026-10-23T10:00"), reglages, nouveauxDommages: [] });
    expect([c.retardMinutes, c.joursRetard]).toEqual([60, 0]);
  });

  it("kilométrage illimité et véhicule électrique", () => {
    const c = comparerEtatsDesLieux({
      contrat: { ...contrat, kilometrageIllimite: true },
      depart: { ...depart, niveauCarburantHuitiemes: null, niveauBatteriePct: 90 },
      retour: { ...depart, kilometrage: 45000, niveauCarburantHuitiemes: null, niveauBatteriePct: 40 },
      retourReelLe: d("2026-10-23T09:00"),
      reglages,
      nouveauxDommages: [],
    });
    expect(c.kmInclus).toBeNull();
    expect(c.fraisProposes).toEqual([{ type: "CARBURANT", libelle: "Recharge de la batterie (50 %)", quantite: 50, prixUnitaireCentimes: 50, montantCentimes: 2500 }]);
  });

  it("déjà sale au départ : pas de nettoyage facturé", () => {
    const sale = { ...depart, propreteInterieure: "SALE" as const };
    const c = comparerEtatsDesLieux({ contrat, depart: sale, retour: { ...sale, kilometrage: 40100 }, retourReelLe: d("2026-10-23T09:00"), reglages, nouveauxDommages: [] });
    expect(c.salete).toBe(false);
  });

  it("tarif d'une journée de retard selon le type", () => {
    expect(tarifJournalierRetard({ type: "JOURNALIERE", tarifCentimes: 4900, tarifJournalierCentimes: null })).toBe(4900);
    expect(tarifJournalierRetard({ type: "HEBDOMADAIRE", tarifCentimes: 25000, tarifJournalierCentimes: 4500 })).toBe(4500);
    expect(tarifJournalierRetard({ type: "MENSUELLE", tarifCentimes: 90000, tarifJournalierCentimes: null })).toBe(3000);
  });

  it("caution retenue, jamais plus que la caution", () => {
    expect(montantRetenu(80000, "RESTITUEE", 5000)).toBe(0);
    expect(montantRetenu(80000, "RETENUE_TOTALE", null)).toBe(80000);
    expect(montantRetenu(80000, "RETENUE_PARTIELLE", 25000)).toBe(25000);
    expect(montantRetenu(80000, "RETENUE_PARTIELLE", 99000)).toBe(80000);
  });
});
