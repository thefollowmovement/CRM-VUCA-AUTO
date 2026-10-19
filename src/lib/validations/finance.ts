// Validation des dépenses, de la vente et des paramètres de répartition.
import { z } from "zod";
import {
  choixOptionnel,
  dateCalendaire,
  emailOptionnel,
  entierOptionnel,
  identifiant,
  montant,
  pourcentage,
  texteOptionnel,
} from "./communs";

export const MODES_PAIEMENT = ["ESPECES", "CHEQUE", "VIREMENT", "CARTE_BANCAIRE", "PRELEVEMENT", "AUTRE"] as const;
export const LIBELLES_MODE_PAIEMENT: Record<(typeof MODES_PAIEMENT)[number], string> = {
  ESPECES: "Espèces",
  CHEQUE: "Chèque",
  VIREMENT: "Virement",
  CARTE_BANCAIRE: "Carte bancaire",
  PRELEVEMENT: "Prélèvement",
  AUTRE: "Autre",
};

// ---------------------------------------------------------------------
//  Dépense
// ---------------------------------------------------------------------
export const schemaDepense = z.object({
  vehiculeId: identifiant("Le véhicule"),
  date: dateCalendaire("La date"),
  categorieId: identifiant("La catégorie"),
  libelle: texteOptionnel(200),
  montant: montant("Le montant").refine((c) => c > 0, "Le montant doit être supérieur à 0."),
  payeParId: identifiant("« Payé par »"),
  payeSurRecettes: z.boolean(),
  fournisseur: texteOptionnel(120),
  kilometrage: entierOptionnel("Le kilométrage", 0, 2_000_000),
  note: texteOptionnel(2000),
});
export type SaisieDepense = z.input<typeof schemaDepense>;

// ---------------------------------------------------------------------
//  Vente
// ---------------------------------------------------------------------
export const schemaVente = z.object({
  prixVente: montant("Le prix de vente").refine((c) => c > 0, "Le prix de vente doit être supérieur à 0."),
  dateVente: dateCalendaire("La date de vente"),
  kilometrageVente: entierOptionnel("Le kilométrage", 0, 2_000_000),
  acheteurNom: texteOptionnel(120),
  acheteurTelephone: texteOptionnel(30),
  acheteurEmail: emailOptionnel,
  acheteurAdresse: texteOptionnel(300),
  modePaiementVente: choixOptionnel(MODES_PAIEMENT),
  notesVente: texteOptionnel(2000),
});
export type SaisieVente = z.input<typeof schemaVente>;

// ---------------------------------------------------------------------
//  Paramètres de répartition du bénéfice
// ---------------------------------------------------------------------
export const schemaParametresRepartition = z
  .object({
    mode: z.enum(["PRORATA_INVESTISSEMENT", "POURCENTAGE_FIXE"]),
    commission: pourcentage("La commission"),
    partsFixes: z.array(z.object({ partenaireId: identifiant("Le partenaire"), pourcentage: pourcentage("La part") })).max(20),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== "POURCENTAGE_FIXE") return;
    const total = v.partsFixes.reduce((a, p) => a + p.pourcentage, 0);
    if (total !== 10000) {
      ctx.addIssue({
        code: "custom",
        path: ["partsFixes"],
        message: `Le total des parts doit faire 100 % (actuellement ${(total / 100).toLocaleString("fr-FR")} %).`,
      });
    }
    const vus = new Set<string>();
    v.partsFixes.forEach((p, i) => {
      if (vus.has(p.partenaireId)) {
        ctx.addIssue({ code: "custom", path: ["partsFixes", i, "partenaireId"], message: "Partenaire en double." });
      }
      vus.add(p.partenaireId);
    });
  });
export type SaisieParametresRepartition = z.input<typeof schemaParametresRepartition>;
