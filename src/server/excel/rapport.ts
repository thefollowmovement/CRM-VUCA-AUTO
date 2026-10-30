// Export Excel (.xlsx) du bilan de période : une feuille par tableau.
import ExcelJS from "exceljs";
import type { DonneesRapport } from "@/server/requetes/rapports";

const EUROS = '#,##0.00 "€";[Red]-#,##0.00 "€"';
const eur = (c: number) => c / 100;
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

type Col = { titre: string; largeur: number; format?: "euros" | "date" | "pourcent" };

function feuille(classeur: ExcelJS.Workbook, nom: string, colonnes: Col[], lignes: (string | number | Date | null)[][], total?: (string | number | null)[]) {
  const f = classeur.addWorksheet(nom, { views: [{ state: "frozen", ySplit: 1 }] });
  f.columns = colonnes.map((c) => ({
    header: c.titre,
    width: c.largeur,
    style: { numFmt: c.format === "euros" ? EUROS : c.format === "date" ? "dd/mm/yyyy" : c.format === "pourcent" ? "0.00 %" : undefined },
  }));
  f.getRow(1).font = { bold: true };
  f.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  for (const l of lignes) f.addRow(l);
  if (total) {
    const r = f.addRow(total);
    r.font = { bold: true };
  }
  return f;
}

export async function rapportExcel(r: DonneesRapport): Promise<Buffer> {
  const classeur = new ExcelJS.Workbook();
  classeur.creator = "VUCA AUTO CRM";
  classeur.created = new Date();
  const t = r.totaux;

  const synthese = feuille(
    classeur,
    "Synthèse",
    [
      { titre: "Indicateur", largeur: 34 },
      { titre: "Montant", largeur: 18, format: "euros" },
    ],
    [
      ["Bénéfice net", eur(t.beneficeNetCentimes)],
      ["CA ventes", eur(t.caVenteCentimes)],
      ["Bénéfice des ventes", eur(t.beneficeVenteCentimes)],
      ["Revenus location", eur(t.revenusLocationCentimes)],
      ["Charges location", eur(t.chargesLocationCentimes)],
      ["Résultat location", eur(t.revenusLocationCentimes - t.chargesLocationCentimes)],
      ["Dépenses payées", eur(t.depensesCentimes)],
      ["Véhicules vendus", r.vendus.length],
      ["Véhicules achetés", r.achetes.length],
    ],
  );
  // Nombres de véhicules : pas au format euros
  synthese.getCell("B9").numFmt = "0";
  synthese.getCell("B10").numFmt = "0";
  synthese.insertRow(1, [`Bilan du ${r.du.split("-").reverse().join("/")} au ${r.au.split("-").reverse().join("/")}${r.partenaire ? ` · véhicules financés par ${r.partenaire.nom}` : ""}`]);
  synthese.getRow(1).font = { bold: true, size: 13 };
  synthese.views = [];

  feuille(
    classeur,
    "Ventes",
    [
      { titre: "Véhicule", largeur: 40 },
      { titre: "Vendu le", largeur: 12, format: "date" },
      { titre: "Prix de vente", largeur: 15, format: "euros" },
      { titre: "Coût de revient", largeur: 15, format: "euros" },
      { titre: "Bénéfice", largeur: 15, format: "euros" },
      { titre: "Marge", largeur: 10, format: "pourcent" },
      { titre: "Jours en stock", largeur: 14 },
    ],
    r.vendus.map((v) => [v.vehicule, jour(v.dateVente), eur(v.prixVenteCentimes), eur(v.coutRevientCentimes), eur(v.beneficeCentimes), v.margeBp === null ? null : v.margeBp / 10000, v.jours]),
    ["Total", null, eur(t.caVenteCentimes), eur(r.vendus.reduce((a, v) => a + v.coutRevientCentimes, 0)), eur(r.vendus.reduce((a, v) => a + v.beneficeCentimes, 0)), null, null],
  );
  feuille(
    classeur,
    "Achats",
    [
      { titre: "Véhicule", largeur: 40 },
      { titre: "Acheté le", largeur: 12, format: "date" },
      { titre: "Type", largeur: 16 },
      { titre: "Prix d'achat", largeur: 15, format: "euros" },
    ],
    r.achetes.map((v) => [v.vehicule, jour(v.dateAchat), { ACHAT_REVENTE: "Achat-revente", LOCATION: "Location", MIXTE: "Mixte" }[v.type], eur(v.prixAchatCentimes)]),
    ["Total", null, null, eur(r.achetes.reduce((a, v) => a + v.prixAchatCentimes, 0))],
  );
  feuille(
    classeur,
    "Location",
    [
      { titre: "Véhicule", largeur: 40 },
      { titre: "Revenus", largeur: 15, format: "euros" },
      { titre: "Charges", largeur: 15, format: "euros" },
      { titre: "Résultat", largeur: 15, format: "euros" },
    ],
    r.location.map((v) => [v.vehicule, eur(v.revenusCentimes), eur(v.chargesCentimes), eur(v.resultatCentimes)]),
    ["Total", eur(t.revenusLocationCentimes), eur(t.chargesLocationCentimes), eur(t.revenusLocationCentimes - t.chargesLocationCentimes)],
  );
  feuille(
    classeur,
    "Dépenses",
    [
      { titre: "Catégorie", largeur: 30 },
      { titre: "Montant", largeur: 15, format: "euros" },
    ],
    r.depensesParCategorie.map((c) => [c.categorie, eur(c.montantCentimes)]),
    ["Total", eur(t.depensesCentimes)],
  );
  feuille(
    classeur,
    "Partenaires",
    [
      { titre: "Partenaire", largeur: 30 },
      { titre: "Bénéfice de la période", largeur: 22, format: "euros" },
    ],
    r.parPartenaire.map((p) => [p.nom, eur(p.montantCentimes)]),
    ["Total", eur(r.parPartenaire.reduce((a, p) => a + p.montantCentimes, 0))],
  );
  return Buffer.from(await classeur.xlsx.writeBuffer());
}
