// =====================================================================
//  Données de démonstration (complétées au fil des phases :
//  véhicules en Phase 2, dépenses en Phase 3, location en Phase 4…).
// =====================================================================
import type { PrismaClient } from "../../src/generated/prisma/client";

export const INVESTISSEURS_DEMO = [
  {
    nom: "Karim Benali",
    telephone: "06 12 34 56 78",
    email: "karim.benali@exemple.fr",
    iban: "FR7630006000011234567890189",
    notes: "Investisseur historique, préfère les citadines.",
  },
  {
    nom: "Sophie Martin",
    telephone: "06 98 76 54 32",
    email: "sophie.martin@exemple.fr",
    iban: null,
    notes: null,
  },
  {
    nom: "Thomas Lefèvre",
    telephone: "07 11 22 33 44",
    email: "thomas.lefevre@exemple.fr",
    iban: "FR7610107001011234567890129",
    notes: "Intéressé par la location longue durée.",
  },
];

export async function chargerDemo(db: PrismaClient) {
  for (const inv of INVESTISSEURS_DEMO) {
    const existe = await db.partenaire.findFirst({ where: { nom: inv.nom } });
    if (!existe) await db.partenaire.create({ data: { ...inv, type: "INVESTISSEUR" } });
  }
}
