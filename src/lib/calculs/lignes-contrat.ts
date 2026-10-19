// Détail du prix d'un contrat en lignes (facture, contrat PDF). Pur, sans base de données.
import { formatEuros } from "@/lib/format";
import { UNITE_TYPE_LOCATION } from "@/lib/validations/location";

/** Location (durée × tarif), options, livraison, remise : la somme des lignes = prix total du contrat. */
export function lignesPrixContrat(c: {
  type: "JOURNALIERE" | "HEBDOMADAIRE" | "MENSUELLE";
  tarifCentimes: number;
  tarifJournalierCentimes: number | null;
  dureeFacturee: number;
  joursSupplementaires: number;
  prixTotalCentimes: number;
  remiseCentimes: number;
  fraisLivraisonCentimes: number;
  options: { libelle: string; quantite: number; totalCentimes: number }[];
}) {
  const totalOptions = c.options.reduce((a, o) => a + o.totalCentimes, 0);
  const baseLoc = c.prixTotalCentimes + c.remiseCentimes - totalOptions - c.fraisLivraisonCentimes;
  const [un, plusieurs] = UNITE_TYPE_LOCATION[c.type];
  let detail = `${c.dureeFacturee} ${c.dureeFacturee > 1 ? plusieurs : un} × ${formatEuros(c.tarifCentimes)}`;
  if (c.joursSupplementaires > 0) detail += c.type === "HEBDOMADAIRE" ? ` + ${c.joursSupplementaires} j` : ` + ${c.joursSupplementaires} j au prorata`;
  const lignes = [{ libelle: `Location (${detail})`, montant: baseLoc }];
  for (const o of c.options) lignes.push({ libelle: `${o.libelle}${o.quantite > 1 ? ` × ${o.quantite}` : ""}`, montant: o.totalCentimes });
  if (c.fraisLivraisonCentimes > 0) lignes.push({ libelle: "Livraison", montant: c.fraisLivraisonCentimes });
  if (c.remiseCentimes > 0) lignes.push({ libelle: "Remise", montant: -c.remiseCentimes });
  return lignes;
}
