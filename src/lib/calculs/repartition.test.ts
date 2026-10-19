import { describe, expect, it } from "vitest";
import { calculerRentabilite } from "./rentabilite";
import { calculerInvestissements, diviserArrondi, repartirBenefice, type ParametresRepartition } from "./repartition";

const V = "vuca";
const A = "investisseurA";
const B = "investisseurB";
const C = "investisseurC";
const prorata = (commissionBp = 0): ParametresRepartition => ({ mode: "PRORATA_INVESTISSEMENT", commissionBp, societeId: V });
const ligne = (r: ReturnType<typeof repartirBenefice>, id: string) => r.lignes.find((l) => l.partenaireId === id)!;
const eur = (e: number) => Math.round(e * 100);

// Exemple de référence du cahier des charges (Peugeot 208)
const participations208 = [
  { partenaireId: V, montantCentimes: eur(3000) },
  { partenaireId: A, montantCentimes: eur(5000) },
];
const depenses208 = [
  { payeParId: V, montantCentimes: eur(300), payeSurRecettes: false }, // carte grise
  { payeParId: A, montantCentimes: eur(700), payeSurRecettes: false }, // réparation
];

describe("diviserArrondi", () => {
  it("arrondit au plus proche, demi vers l'extérieur", () => {
    expect(diviserArrondi(5, 2)).toBe(3);
    expect(diviserArrondi(-5, 2)).toBe(-3);
    expect(diviserArrondi(4, 3)).toBe(1);
    expect(diviserArrondi(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("Exemple de référence — Peugeot 208", () => {
  const inv = calculerInvestissements(participations208, depenses208);
  const rentab = calculerRentabilite({
    prixAchatCentimes: eur(8000),
    totalDepensesCentimes: eur(1000),
    prixVenteCentimes: eur(11500),
    autresRevenusCentimes: 0,
    prixCibleCentimes: null,
    valeurEstimeeCentimes: null,
  });

  it("coût de revient 9 000 € → bénéfice 2 500 €", () => {
    expect(rentab.coutDeRevientCentimes).toBe(eur(9000));
    expect(rentab.beneficeCentimes).toBe(eur(2500));
    expect(rentab.margeBp).toBe(2174); // 21,74 %
    expect(rentab.roiBp).toBe(2778); // 27,78 %
    expect(rentab.previsionnel).toBe(false);
  });

  it("investissements : VUCA 3 300 € (36,67 %) · A 5 700 € (63,33 %)", () => {
    const r = repartirBenefice(inv, eur(2500), prorata());
    expect(ligne(r, V).investiCentimes).toBe(eur(3300));
    expect(ligne(r, A).investiCentimes).toBe(eur(5700));
    expect(ligne(r, V).partInvestissementBp).toBe(3667);
    expect(ligne(r, A).partInvestissementBp).toBe(6333);
  });

  it("bénéfices : VUCA 916,67 € · A 1 583,33 € → à reverser 4 216,67 € / 7 283,33 € (total 11 500 €)", () => {
    const r = repartirBenefice(inv, eur(2500), prorata());
    expect(ligne(r, V).beneficeCentimes).toBe(91667);
    expect(ligne(r, A).beneficeCentimes).toBe(158333);
    expect(ligne(r, V).aReverserCentimes).toBe(421667);
    expect(ligne(r, A).aReverserCentimes).toBe(728333);
    expect(r.totalAReverserCentimes).toBe(eur(11500));
    expect(r.lignes[0]!.partenaireId).toBe(V); // VUCA AUTO en premier
  });

  it("commission de gestion 20 % : 500 €, puis VUCA 1 233,33 € · A 1 266,67 €", () => {
    const r = repartirBenefice(inv, eur(2500), prorata(2000));
    expect(r.commissionCentimes).toBe(eur(500));
    expect(r.beneficeAPartagerCentimes).toBe(eur(2000));
    expect(ligne(r, V).commissionCentimes).toBe(eur(500));
    expect(ligne(r, V).beneficeCentimes).toBe(123333);
    expect(ligne(r, A).beneficeCentimes).toBe(126667);
    expect(r.totalAReverserCentimes).toBe(eur(11500));
  });

  it("perte : vendue 8 100 € → −900 € → VUCA −330,00 € · A −570,00 €", () => {
    const r = repartirBenefice(inv, eur(-900), prorata(2000)); // commission ignorée en cas de perte
    expect(r.commissionCentimes).toBe(0);
    expect(ligne(r, V).beneficeCentimes).toBe(eur(-330));
    expect(ligne(r, A).beneficeCentimes).toBe(eur(-570));
    expect(ligne(r, V).aReverserCentimes).toBe(eur(2970));
    expect(ligne(r, A).aReverserCentimes).toBe(eur(5130));
    expect(r.totalAReverserCentimes).toBe(eur(8100));
  });
});

describe("Autres cas", () => {
  it("100 % VUCA AUTO", () => {
    const inv = calculerInvestissements([{ partenaireId: V, montantCentimes: eur(9500) }], [{ payeParId: V, montantCentimes: eur(500), payeSurRecettes: false }]);
    const r = repartirBenefice(inv, eur(2900), prorata(2000));
    expect(r.lignes).toHaveLength(1);
    expect(ligne(r, V).beneficeCentimes).toBe(eur(2900));
    expect(ligne(r, V).aReverserCentimes).toBe(eur(12900));
  });

  it("trois investisseurs + VUCA, et arrondis à trois tiers", () => {
    const inv = calculerInvestissements(
      [
        { partenaireId: V, montantCentimes: eur(3500) },
        { partenaireId: A, montantCentimes: eur(3500) },
        { partenaireId: B, montantCentimes: eur(3500) },
      ],
      [],
    );
    const r = repartirBenefice(inv, 100, prorata()); // 1,00 € à partager en trois
    expect(ligne(r, A).beneficeCentimes).toBe(33);
    expect(ligne(r, B).beneficeCentimes).toBe(33);
    expect(ligne(r, V).beneficeCentimes).toBe(34); // l'écart d'arrondi va à VUCA AUTO
    expect([3334, 3333, 3333]).toContain(ligne(r, V).partInvestissementBp);
    const somme = r.lignes.reduce((a, l) => a + l.partInvestissementBp, 0);
    expect(somme).toBe(10000);
  });

  it("quatre partenaires : la somme tombe toujours juste", () => {
    const inv = calculerInvestissements(
      [
        { partenaireId: V, montantCentimes: 333333 },
        { partenaireId: A, montantCentimes: 222222 },
        { partenaireId: B, montantCentimes: 111111 },
        { partenaireId: C, montantCentimes: 77777 },
      ],
      [{ payeParId: C, montantCentimes: 12345, payeSurRecettes: false }],
    );
    for (const benefice of [1, 7, 99999, -12345, 314159, -1]) {
      const r = repartirBenefice(inv, benefice, prorata(1500));
      expect(r.lignes.reduce((a, l) => a + l.beneficeCentimes, 0)).toBe(benefice);
      expect(r.totalAReverserCentimes).toBe(r.totalInvestiCentimes + benefice);
    }
  });

  it("mode pourcentage fixe : 50/50 alors qu'un seul a financé ; le capital reste à celui qui l'a apporté", () => {
    const inv = calculerInvestissements([{ partenaireId: A, montantCentimes: eur(10000) }], []);
    const r = repartirBenefice(inv, eur(3000), {
      mode: "POURCENTAGE_FIXE",
      commissionBp: 0,
      partsFixes: [
        { partenaireId: V, pourcentageBp: 5000 },
        { partenaireId: A, pourcentageBp: 5000 },
      ],
      societeId: V,
    });
    expect(ligne(r, V).investiCentimes).toBe(0);
    expect(ligne(r, V).beneficeCentimes).toBe(eur(1500));
    expect(ligne(r, V).aReverserCentimes).toBe(eur(1500));
    expect(ligne(r, A).aReverserCentimes).toBe(eur(11500));
    expect(ligne(r, A).partBeneficeBp).toBe(5000);
  });

  it("pourcentage fixe + commission + perte", () => {
    const inv = calculerInvestissements([{ partenaireId: V, montantCentimes: eur(5000) }, { partenaireId: A, montantCentimes: eur(5000) }], []);
    const r = repartirBenefice(inv, eur(-1000), {
      mode: "POURCENTAGE_FIXE",
      commissionBp: 2000,
      partsFixes: [{ partenaireId: V, pourcentageBp: 7000 }, { partenaireId: A, pourcentageBp: 3000 }],
      societeId: V,
    });
    expect(r.commissionCentimes).toBe(0);
    expect(ligne(r, V).beneficeCentimes).toBe(eur(-700));
    expect(ligne(r, A).beneficeCentimes).toBe(eur(-300));
  });

  it("dépenses sans achat cofinancé : VUCA achète seul, A paie une réparation", () => {
    const inv = calculerInvestissements(
      [{ partenaireId: V, montantCentimes: eur(5000) }],
      [{ payeParId: A, montantCentimes: eur(1000), payeSurRecettes: false }],
    );
    const r = repartirBenefice(inv, eur(1200), prorata());
    expect(ligne(r, A).investiCentimes).toBe(eur(1000));
    expect(ligne(r, A).achatCentimes).toBe(0);
    expect(ligne(r, A).beneficeCentimes).toBe(eur(200)); // 1/6
    expect(ligne(r, V).beneficeCentimes).toBe(eur(1000)); // 5/6
  });

  it("dépense payée avec les recettes : réduit le bénéfice mais n'est l'investissement de personne", () => {
    const inv = calculerInvestissements(
      [{ partenaireId: V, montantCentimes: eur(4000) }, { partenaireId: A, montantCentimes: eur(6000) }],
      [{ payeParId: V, montantCentimes: eur(800), payeSurRecettes: true }],
    );
    expect(inv.find((i) => i.partenaireId === V)!.totalCentimes).toBe(eur(4000));
    const r = repartirBenefice(inv, eur(1000), prorata());
    expect(ligne(r, V).beneficeCentimes).toBe(eur(400));
    expect(ligne(r, A).beneficeCentimes).toBe(eur(600));
  });

  it("VUCA AUTO absent : l'arrondi va au partenaire le plus engagé", () => {
    const inv = calculerInvestissements([{ partenaireId: A, montantCentimes: 200 }, { partenaireId: B, montantCentimes: 100 }], []);
    const r = repartirBenefice(inv, 100, prorata());
    expect(r.lignes.map((l) => l.partenaireId).sort()).toEqual([A, B]);
    expect(ligne(r, A).beneficeCentimes).toBe(67);
    expect(ligne(r, B).beneficeCentimes).toBe(33);
  });

  it("aucun investissement enregistré : tout revient à VUCA AUTO", () => {
    const r = repartirBenefice([], eur(500), prorata());
    expect(r.lignes).toEqual([expect.objectContaining({ partenaireId: V, beneficeCentimes: eur(500) })]);
  });
});

describe("calculerRentabilite", () => {
  const base = { prixAchatCentimes: eur(8000), totalDepensesCentimes: eur(1000), autresRevenusCentimes: 0, valeurEstimeeCentimes: null };
  it("non vendu : prévisionnel sur le prix cible", () => {
    const r = calculerRentabilite({ ...base, prixVenteCentimes: null, prixCibleCentimes: eur(11500) });
    expect(r).toMatchObject({ beneficeCentimes: eur(2500), previsionnel: true, source: "prixCible" });
  });
  it("sinon sur la valeur estimée, sinon incalculable", () => {
    expect(calculerRentabilite({ ...base, prixVenteCentimes: null, prixCibleCentimes: null, valeurEstimeeCentimes: eur(9500) }).beneficeCentimes).toBe(eur(500));
    expect(calculerRentabilite({ ...base, prixVenteCentimes: null, prixCibleCentimes: null }).beneficeCentimes).toBeNull();
  });
  it("véhicule mixte : revenus de location ajoutés", () => {
    const r = calculerRentabilite({ ...base, prixVenteCentimes: eur(9000), prixCibleCentimes: null, autresRevenusCentimes: eur(1500) });
    expect(r.revenusCentimes).toBe(eur(10500));
    expect(r.beneficeCentimes).toBe(eur(1500));
  });
});
