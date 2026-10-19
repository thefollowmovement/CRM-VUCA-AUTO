// =====================================================================
//  Données de démonstration (complétées au fil des phases).
//  Chaque bloc n'est chargé qu'UNE fois (repère dans la table Compteur) :
//  si vous supprimez les données de démo, elles ne reviennent pas.
// =====================================================================
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient } from "../../src/generated/prisma/client";
import type { Prisma } from "../../src/generated/prisma/client";

export const INVESTISSEURS_DEMO = [
  { nom: "Karim Benali", telephone: "06 12 34 56 78", email: "karim.benali@exemple.fr", iban: "FR7630006000011234567890189", notes: "Investisseur historique, préfère les citadines." },
  { nom: "Sophie Martin", telephone: "06 98 76 54 32", email: "sophie.martin@exemple.fr", iban: null, notes: null },
  { nom: "Thomas Lefèvre", telephone: "07 11 22 33 44", email: "thomas.lefevre@exemple.fr", iban: "FR7610107001011234567890129", notes: "Intéressé par la location longue durée." },
];

/** Exécute un bloc de démo une seule fois. */
async function uneFois(db: PrismaClient, cle: string, bloc: () => Promise<void>) {
  const repere = await db.compteur.findUnique({ where: { cle } });
  if (repere) return;
  await bloc();
  await db.compteur.create({ data: { cle, valeur: 1 } });
}

export async function chargerDemo(db: PrismaClient) {
  await uneFois(db, "demo:investisseurs", async () => {
    for (const inv of INVESTISSEURS_DEMO) {
      const existe = await db.partenaire.findFirst({ where: { nom: inv.nom } });
      if (!existe) await db.partenaire.create({ data: { ...inv, type: "INVESTISSEUR" } });
    }
  });
  await uneFois(db, "demo:vehicules", () => chargerVehiculesDemo(db));
}

// ---------------------------------------------------------------------
//  Véhicules
// ---------------------------------------------------------------------

const JOUR = 24 * 60 * 60 * 1000;
/** Date calendaire à J+n (n négatif = dans le passé). */
function j(n: number): Date {
  const d = new Date(Date.now() + n * JOUR);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
const eur = (euros: number) => Math.round(euros * 100);

type Demo = {
  donnees: Omit<Prisma.VehiculeUncheckedCreateInput, "id">;
  financement: [string, number][]; // [nom du partenaire, euros]
  couleurIllustration: string;
  historique?: [string, string, number, string?][]; // [ancien, nouveau, il y a n jours, motif]
  estimation?: number;
};

const VEHICULES: Demo[] = [
  {
    // Exemple de référence du cahier des charges (dépenses et vente : Phase 3)
    donnees: {
      marque: "Peugeot", modele: "208", version: "1.2 PureTech 100 Allure", immatriculation: "FG-208-PA", annee: 2020,
      carburant: "ESSENCE", boite: "MANUELLE", couleur: "Gris platinium", nombrePlaces: 5, puissanceFiscale: 5, critAir: "CRIT_AIR_1",
      typeExploitation: "ACHAT_REVENTE", statut: "EN_VENTE", dateAchat: j(-48), prixAchatCentimes: eur(8000),
      kilometrageAchat: 64200, kilometrageActuel: 64350, provenance: "PARTICULIER", nomVendeur: "M. Durand",
      prixCibleCentimes: eur(11500), dateProchainControleTechnique: j(210),
    },
    financement: [["VUCA AUTO", 3000], ["Karim Benali", 5000]],
    couleurIllustration: "#9ca3af",
    historique: [["EN_PREPARATION", "EN_VENTE", 30, "Préparation terminée"]],
  },
  {
    donnees: {
      marque: "Renault", modele: "Clio V", version: "TCe 90 Intens", immatriculation: "GH-451-RC", annee: 2021,
      carburant: "ESSENCE", boite: "MANUELLE", couleur: "Rouge flamme", nombrePlaces: 5, puissanceFiscale: 5, critAir: "CRIT_AIR_1",
      typeExploitation: "ACHAT_REVENTE", statut: "EN_PREPARATION", dateAchat: j(-9), prixAchatCentimes: eur(9500),
      kilometrageAchat: 41800, kilometrageActuel: 41800, provenance: "ENCHERES", prixCibleCentimes: eur(12900),
      dateProchainControleTechnique: j(18), notesAchat: "Achat aux enchères BCA, carrosserie à reprendre (pare-choc arrière).",
    },
    financement: [["VUCA AUTO", 9500]],
    couleurIllustration: "#dc2626",
  },
  {
    donnees: {
      marque: "Dacia", modele: "Sandero", version: "Stepway TCe 90", immatriculation: "FN-777-DS", annee: 2019,
      carburant: "ESSENCE", boite: "MANUELLE", couleur: "Orange atacama", nombrePlaces: 5, puissanceFiscale: 5, critAir: "CRIT_AIR_1",
      typeExploitation: "ACHAT_REVENTE", statut: "EN_VENTE", dateAchat: j(-125), prixAchatCentimes: eur(7200),
      kilometrageAchat: 78900, kilometrageActuel: 79100, provenance: "PROFESSIONNEL", nomVendeur: "Garage du Centre",
      prixCibleCentimes: eur(9490), dateProchainControleTechnique: j(95),
    },
    financement: [["Sophie Martin", 7200]],
    couleurIllustration: "#ea580c",
    historique: [["EN_PREPARATION", "EN_VENTE", 110]],
    estimation: 9000,
  },
  {
    // Trois financeurs à parts égales (arrondis à trois tiers)
    donnees: {
      marque: "Volkswagen", modele: "Golf VII", version: "1.6 TDI 115 Confortline", immatriculation: "EZ-316-VW", annee: 2018,
      carburant: "DIESEL", boite: "MANUELLE", couleur: "Bleu nuit", nombrePlaces: 5, puissanceFiscale: 6, critAir: "CRIT_AIR_2",
      typeExploitation: "ACHAT_REVENTE", statut: "RESERVE", dateAchat: j(-70), prixAchatCentimes: eur(10500),
      kilometrageAchat: 112000, kilometrageActuel: 112150, provenance: "PARTICULIER", prixCibleCentimes: eur(13900),
      dateProchaineVidange: j(40), kmProchaineVidange: 112800,
    },
    financement: [["VUCA AUTO", 3500], ["Karim Benali", 3500], ["Thomas Lefèvre", 3500]],
    couleurIllustration: "#1e3a8a",
    historique: [["EN_PREPARATION", "EN_VENTE", 50], ["EN_VENTE", "RESERVE", 3, "Acompte de 500 € versé par l'acheteur"]],
  },
  {
    donnees: {
      marque: "Toyota", modele: "Yaris", version: "Hybride 116h Design", immatriculation: "GK-582-TY", annee: 2022,
      carburant: "HYBRIDE", boite: "AUTOMATIQUE", couleur: "Blanc pur", nombrePlaces: 5, puissanceFiscale: 4, critAir: "CRIT_AIR_1",
      typeExploitation: "LOCATION", statut: "EN_LOCATION", dateAchat: j(-240), prixAchatCentimes: eur(13000),
      kilometrageAchat: 22000, kilometrageActuel: 38400, provenance: "PROFESSIONNEL",
      tarifJournalierCentimes: eur(39), tarifHebdoCentimes: eur(220), tarifMensuelCentimes: eur(690),
      kmInclusParJour: 200, kmInclusParMois: 2500, prixKmSupCentimes: eur(0.25), cautionDefautCentimes: eur(800),
      franchiseDefautCentimes: eur(1000), dateMiseEnLocation: j(-225),
      assureur: "Hiscox", numeroPoliceAssurance: "LOC-48812", dateEcheanceAssurance: j(-5),
      dateProchaineVidange: j(60), kmProchaineVidange: 39000, dateProchainControleTechnique: j(700),
    },
    financement: [["VUCA AUTO", 5000], ["Thomas Lefèvre", 8000]],
    couleurIllustration: "#f8fafc",
    historique: [["EN_PREPARATION", "DISPONIBLE_LOCATION", 225], ["DISPONIBLE_LOCATION", "EN_LOCATION", 12]],
  },
  {
    donnees: {
      marque: "Tesla", modele: "Model 3", version: "Grande Autonomie AWD", immatriculation: "GB-303-TS", annee: 2021,
      carburant: "ELECTRIQUE", boite: "AUTOMATIQUE", couleur: "Noir uni", nombrePlaces: 5, puissanceFiscale: 3, critAir: "CRIT_AIR_0",
      typeExploitation: "LOCATION", statut: "DISPONIBLE_LOCATION", dateAchat: j(-180), prixAchatCentimes: eur(26000),
      kilometrageAchat: 58000, kilometrageActuel: 71200, provenance: "IMPORT",
      tarifJournalierCentimes: eur(89), tarifHebdoCentimes: eur(520), tarifMensuelCentimes: eur(1490),
      kmInclusParJour: 250, kmInclusParMois: 3000, prixKmSupCentimes: eur(0.3), cautionDefautCentimes: eur(2000),
      franchiseDefautCentimes: eur(2500), dateMiseEnLocation: j(-160),
      assureur: "Hiscox", numeroPoliceAssurance: "LOC-48813", dateEcheanceAssurance: j(120), dateProchaineRevision: j(25),
    },
    financement: [["VUCA AUTO", 10000], ["Sophie Martin", 16000]],
    couleurIllustration: "#111827",
    historique: [["EN_PREPARATION", "DISPONIBLE_LOCATION", 160]],
    estimation: 24500,
  },
  {
    donnees: {
      marque: "Renault", modele: "Captur", version: "E-Tech 145 Techno", immatriculation: "GL-145-CP", annee: 2022,
      carburant: "HYBRIDE", boite: "AUTOMATIQUE", couleur: "Bleu iron", nombrePlaces: 5, puissanceFiscale: 5, critAir: "CRIT_AIR_1",
      typeExploitation: "MIXTE", statut: "EN_LOCATION", dateAchat: j(-150), prixAchatCentimes: eur(15500),
      kilometrageAchat: 31000, kilometrageActuel: 40250, provenance: "PROFESSIONNEL", prixCibleCentimes: eur(19900),
      tarifJournalierCentimes: eur(49), tarifMensuelCentimes: eur(790), kmInclusParJour: 200, kmInclusParMois: 2500,
      prixKmSupCentimes: eur(0.25), cautionDefautCentimes: eur(1000), franchiseDefautCentimes: eur(1200), dateMiseEnLocation: j(-140),
      dateProchainControleTechnique: j(14), kmProchaineVidange: 40800,
    },
    financement: [["VUCA AUTO", 15500]],
    couleurIllustration: "#475569",
    historique: [["EN_PREPARATION", "DISPONIBLE_LOCATION", 140], ["DISPONIBLE_LOCATION", "EN_LOCATION", 20]],
  },
  {
    // Vendu à perte
    donnees: {
      marque: "Peugeot", modele: "3008", version: "1.5 BlueHDi 130 GT Line", immatriculation: "EV-930-PG", annee: 2019,
      carburant: "DIESEL", boite: "AUTOMATIQUE", couleur: "Gris artense", nombrePlaces: 5, puissanceFiscale: 7, critAir: "CRIT_AIR_2",
      typeExploitation: "ACHAT_REVENTE", statut: "VENDU", dateAchat: j(-200), prixAchatCentimes: eur(18500),
      kilometrageAchat: 95000, kilometrageActuel: 95600, provenance: "ENCHERES", prixCibleCentimes: eur(21900),
      prixVenteCentimes: eur(17900), dateVente: j(-35), kilometrageVente: 95600, acheteurNom: "Mme Lambert", modePaiementVente: "VIREMENT",
      notesVente: "Boîte automatique défaillante découverte après l'achat : vendu en l'état.",
    },
    financement: [["VUCA AUTO", 8500], ["Karim Benali", 10000]],
    couleurIllustration: "#6b7280",
    historique: [["EN_PREPARATION", "EN_VENTE", 180], ["EN_VENTE", "VENDU", 35]],
  },
  {
    donnees: {
      marque: "BMW", modele: "Série 1", version: "118i M Sport", immatriculation: "FA-118-BM", annee: 2020,
      carburant: "ESSENCE", boite: "AUTOMATIQUE", couleur: "Blanc alpin", nombrePlaces: 5, puissanceFiscale: 7, critAir: "CRIT_AIR_1",
      typeExploitation: "ACHAT_REVENTE", statut: "VENDU", dateAchat: j(-160), prixAchatCentimes: eur(14200),
      kilometrageAchat: 52000, kilometrageActuel: 52300, provenance: "REPRISE", prixCibleCentimes: eur(17900),
      prixVenteCentimes: eur(17500), dateVente: j(-90), kilometrageVente: 52300, acheteurNom: "M. Petit", modePaiementVente: "CHEQUE",
    },
    financement: [["VUCA AUTO", 14200]],
    couleurIllustration: "#e5e7eb",
    historique: [["EN_PREPARATION", "EN_VENTE", 150], ["EN_VENTE", "VENDU", 90]],
  },
  {
    donnees: {
      marque: "Citroën", modele: "C3", version: "PureTech 83 Shine", immatriculation: "EM-283-CT", annee: 2017,
      carburant: "ESSENCE", boite: "MANUELLE", couleur: "Jaune citron", nombrePlaces: 5, puissanceFiscale: 4, critAir: "CRIT_AIR_1",
      typeExploitation: "ACHAT_REVENTE", statut: "VENDU", dateAchat: j(-110), prixAchatCentimes: eur(6800),
      kilometrageAchat: 88000, kilometrageActuel: 88200, provenance: "PARTICULIER",
      prixCibleCentimes: eur(8990), prixVenteCentimes: eur(8900), dateVente: j(-60), kilometrageVente: 88200, acheteurNom: "M. Bernard", modePaiementVente: "ESPECES",
    },
    financement: [["VUCA AUTO", 3400], ["Sophie Martin", 3400]],
    couleurIllustration: "#facc15",
    historique: [["EN_PREPARATION", "EN_VENTE", 100], ["EN_VENTE", "VENDU", 60]],
  },
  {
    donnees: {
      marque: "Fiat", modele: "500", version: "1.2 69 Lounge", immatriculation: "DY-500-FT", annee: 2016,
      carburant: "ESSENCE", boite: "MANUELLE", couleur: "Vert menthe", nombrePlaces: 4, puissanceFiscale: 4, critAir: "CRIT_AIR_1",
      typeExploitation: "ACHAT_REVENTE", statut: "IMMOBILISE", dateAchat: j(-130), prixAchatCentimes: eur(5900),
      kilometrageAchat: 101000, kilometrageActuel: 101050, provenance: "PARTICULIER", prixCibleCentimes: eur(7990),
    },
    financement: [["VUCA AUTO", 5900]],
    couleurIllustration: "#6ee7b7",
    historique: [["EN_PREPARATION", "EN_VENTE", 115], ["EN_VENTE", "IMMOBILISE", 21, "Au garage : embrayage à remplacer"]],
  },
  {
    // Écart de financement accepté (apport attendu)
    donnees: {
      marque: "Kia", modele: "Niro", version: "EV 204 Active", immatriculation: "GE-204-KN", annee: 2021,
      carburant: "ELECTRIQUE", boite: "AUTOMATIQUE", couleur: "Gris acier", nombrePlaces: 5, puissanceFiscale: 3, critAir: "CRIT_AIR_0",
      typeExploitation: "LOCATION", statut: "DISPONIBLE_LOCATION", dateAchat: j(-20), prixAchatCentimes: eur(21000),
      kilometrageAchat: 39000, kilometrageActuel: 39000, provenance: "PROFESSIONNEL",
      tarifMensuelCentimes: eur(890), kmInclusParMois: 2000, prixKmSupCentimes: eur(0.2), cautionDefautCentimes: eur(1500),
      franchiseDefautCentimes: eur(1500), dateMiseEnLocation: j(-10),
      ecartFinancementAccepte: true, ecartFinancementMotif: "Apport complémentaire de Thomas attendu fin du mois.",
    },
    financement: [["VUCA AUTO", 6000], ["Thomas Lefèvre", 13000]],
    couleurIllustration: "#64748b",
    historique: [["EN_PREPARATION", "DISPONIBLE_LOCATION", 10]],
  },
];

/** Illustration simple d'une voiture (JPEG généré, aucune police nécessaire). */
async function illustration(couleur: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#f8fafc"/></linearGradient></defs>
  <rect width="1200" height="675" fill="url(#f)"/>
  <rect y="520" width="1200" height="155" fill="#cbd5e1"/>
  <path d="M190 470 Q200 390 300 375 L430 300 Q480 270 560 268 L760 268 Q840 270 900 320 L980 380 Q1050 395 1040 470 Z" fill="${couleur}" stroke="#1f2937" stroke-width="6"/>
  <path d="M455 312 L560 290 L640 290 L640 372 L405 372 Z M670 290 L760 290 Q820 292 870 345 L880 372 L670 372 Z" fill="#bfdbfe" stroke="#1f2937" stroke-width="5"/>
  <circle cx="345" cy="480" r="62" fill="#1f2937"/><circle cx="345" cy="480" r="28" fill="#9ca3af"/>
  <circle cx="880" cy="480" r="62" fill="#1f2937"/><circle cx="880" cy="480" r="28" fill="#9ca3af"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

async function chargerVehiculesDemo(db: PrismaClient) {
  const partenaires = new Map((await db.partenaire.findMany()).map((p) => [p.nom, p.id]));
  const racine = path.resolve(process.env.STORAGE_DIR ?? "./storage");

  for (const demo of VEHICULES) {
    // Ne pas dupliquer si l'immatriculation existe déjà
    if (demo.donnees.immatriculation && (await db.vehicule.findUnique({ where: { immatriculation: demo.donnees.immatriculation } }))) continue;

    const v = await db.vehicule.create({ data: demo.donnees });
    await db.participation.createMany({
      data: demo.financement.map(([nom, euros]) => {
        const partenaireId = partenaires.get(nom);
        if (!partenaireId) throw new Error(`Partenaire de démo introuvable : ${nom}`);
        return { vehiculeId: v.id, partenaireId, montantCentimes: eur(euros), date: demo.donnees.dateAchat as Date };
      }),
    });

    // Historique des statuts
    const premier = demo.historique?.[0]?.[0] ?? demo.donnees.statut ?? "EN_PREPARATION";
    await db.historiqueStatutVehicule.create({
      data: { vehiculeId: v.id, ancienStatut: null, nouveauStatut: premier as never, changeLe: demo.donnees.dateAchat as Date, motif: "Création du véhicule" },
    });
    for (const [ancien, nouveau, ilYa, motif] of demo.historique ?? []) {
      await db.historiqueStatutVehicule.create({
        data: { vehiculeId: v.id, ancienStatut: ancien as never, nouveauStatut: nouveau as never, changeLe: j(-ilYa), motif: motif ?? null },
      });
    }

    if (demo.estimation) {
      await db.estimationValeur.create({ data: { vehiculeId: v.id, montantCentimes: eur(demo.estimation), estimeLe: j(-7), source: "La Centrale" } });
    }

    // Photo d'illustration (photo principale)
    const cle = `demo/${randomUUID()}.jpg`;
    const contenu = await illustration(demo.couleurIllustration);
    await mkdir(path.join(racine, "demo"), { recursive: true });
    await writeFile(path.join(racine, cle), contenu);
    await db.fichier.create({
      data: {
        categorie: "PHOTO_VEHICULE", cleStockage: cle, nomOriginal: "illustration.jpg", typeMime: "image/jpeg",
        tailleOctets: contenu.length, largeur: 1200, hauteur: 675, estPrincipale: true, ordre: 1, vehiculeId: v.id,
      },
    });
  }
}
