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
import { calculerPrixLocation } from "../../src/lib/calculs/location";
import { dateDepuisParis, partiesParis } from "../../src/lib/dates";

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
  await uneFois(db, "demo:depenses", () => chargerDepensesDemo(db));
  await uneFois(db, "demo:location", () => chargerLocationDemo(db));
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

// ---------------------------------------------------------------------
//  Dépenses, règles de répartition et versements (Phase 3)
// ---------------------------------------------------------------------

// [immatriculation, code catégorie, payé par, euros, il y a n jours, libellé, options]
type DepenseDemo = [string, string, string, number, number, string?, { surRecettes?: boolean; fournisseur?: string; km?: number }?];

const DEPENSES: DepenseDemo[] = [
  // Exemple de référence : carte grise 300 € (VUCA AUTO) + réparation 700 € (Karim)
  ["FG-208-PA", "CARTE_GRISE", "VUCA AUTO", 300, 45, "Carte grise"],
  ["FG-208-PA", "MECANIQUE", "Karim Benali", 700, 40, "Embrayage + disques", { fournisseur: "Garage Martin" }],
  ["GH-451-RC", "NETTOYAGE", "VUCA AUTO", 150, 5, "Préparation esthétique complète"],
  ["FN-777-DS", "PNEUS", "Sophie Martin", 380, 110, "4 pneus Michelin", { fournisseur: "Euromaster" }],
  ["FN-777-DS", "PUBLICITE", "VUCA AUTO", 49, 100, "Annonce Leboncoin à la une"],
  ["EZ-316-VW", "CONTROLE_TECHNIQUE", "VUCA AUTO", 78, 65, "Contrôle technique"],
  ["EZ-316-VW", "CARROSSERIE", "Thomas Lefèvre", 450, 60, "Pare-chocs avant", { fournisseur: "Carrosserie du Parc" }],
  ["GK-582-TY", "ENTRETIEN", "VUCA AUTO", 180, 90, "Révision 60 000 km", { km: 61200 }],
  ["GK-582-TY", "ASSURANCE", "VUCA AUTO", 85, 60, "Assurance flotte (mois)", { surRecettes: true }],
  ["GK-582-TY", "ASSURANCE", "VUCA AUTO", 85, 30, "Assurance flotte (mois)", { surRecettes: true }],
  ["GB-303-TS", "PNEUS", "Sophie Martin", 920, 150, "Pneus été Michelin Pilot Sport"],
  ["GB-303-TS", "ASSURANCE", "VUCA AUTO", 120, 30, "Assurance flotte (mois)", { surRecettes: true }],
  ["GL-145-CP", "ENTRETIEN", "VUCA AUTO", 160, 45, "Vidange + filtres"],
  ["EV-930-PG", "MECANIQUE", "Karim Benali", 1200, 150, "Diagnostic boîte automatique", { fournisseur: "Garage Martin" }],
  ["EV-930-PG", "TRANSPORT", "VUCA AUTO", 250, 195, "Convoyage depuis l'enchère"],
  ["FA-118-BM", "CARTE_GRISE", "VUCA AUTO", 350, 155, "Carte grise"],
  ["FA-118-BM", "NETTOYAGE", "VUCA AUTO", 120, 140, "Préparation esthétique"],
  ["EM-283-CT", "CONTROLE_TECHNIQUE", "Sophie Martin", 78, 105, "Contrôle technique"],
  ["EM-283-CT", "PIECES", "VUCA AUTO", 210, 100, "Plaquettes + disques"],
  ["DY-500-FT", "MECANIQUE", "VUCA AUTO", 650, 20, "Courroie de distribution", { fournisseur: "Garage Martin" }],
];

async function chargerDepensesDemo(db: PrismaClient) {
  const partenaires = new Map((await db.partenaire.findMany()).map((p) => [p.nom, p.id]));
  const categories = new Map((await db.categorieDepense.findMany()).map((c) => [c.code, c]));
  const vehicule = async (immat: string) => db.vehicule.findUnique({ where: { immatriculation: immat }, select: { id: true } });

  for (const [immat, code, payeur, euros, ilYa, libelle, opts] of DEPENSES) {
    const v = await vehicule(immat);
    const categorie = categories.get(code);
    const payeParId = partenaires.get(payeur);
    if (!v || !categorie || !payeParId) continue; // véhicule de démo supprimé entre-temps
    await db.depense.create({
      data: {
        vehiculeId: v.id, date: j(-ilYa), categorieId: categorie.id, libelle: libelle ?? categorie.nom, montantCentimes: eur(euros),
        payeParId, payeSurRecettes: opts?.surRecettes ?? false, fournisseur: opts?.fournisseur ?? null, kilometrage: opts?.km ?? null,
      },
    });
  }

  // Règles de répartition : C3 avec commission 15 %, Golf en pourcentages fixes + commission 10 %
  const c3 = await vehicule("EM-283-CT");
  if (c3) await db.vehicule.update({ where: { id: c3.id }, data: { commissionGestionBp: 1500 } });
  const golf = await vehicule("EZ-316-VW");
  const [vuca, karim, thomas, sophie] = ["VUCA AUTO", "Karim Benali", "Thomas Lefèvre", "Sophie Martin"].map((n) => partenaires.get(n));
  if (golf && vuca && karim && thomas) {
    await db.vehicule.update({ where: { id: golf.id }, data: { modeRepartition: "POURCENTAGE_FIXE", commissionGestionBp: 1000 } });
    await db.partBeneficeFixe.createMany({
      data: [
        { vehiculeId: golf.id, partenaireId: vuca, pourcentageBp: 4000 },
        { vehiculeId: golf.id, partenaireId: karim, pourcentageBp: 3000 },
        { vehiculeId: golf.id, partenaireId: thomas, pourcentageBp: 3000 },
      ],
    });
  }

  // Versements déjà faits sur les véhicules vendus (il reste un solde dû)
  if (c3 && sophie) {
    await db.versement.createMany({
      data: [
        { partenaireId: sophie, vehiculeId: c3.id, date: j(-55), montantCentimes: eur(3478), type: "REMBOURSEMENT_CAPITAL", mode: "VIREMENT" },
        { partenaireId: sophie, vehiculeId: c3.id, date: j(-50), montantCentimes: eur(500), type: "VERSEMENT_BENEFICE", mode: "VIREMENT" },
      ],
    });
  }
  const p3008 = await vehicule("EV-930-PG");
  if (p3008 && karim) {
    await db.versement.create({
      data: { partenaireId: karim, vehiculeId: p3008.id, date: j(-30), montantCentimes: eur(10000), type: "REMBOURSEMENT_CAPITAL", mode: "VIREMENT" },
    });
  }
}

// ---------------------------------------------------------------------
//  Clients et contrats de location (Phase 4)
// ---------------------------------------------------------------------

const an = (annees: number) => j(-Math.round(annees * 365.25));

const CLIENTS_DEMO: Omit<Prisma.ClientUncheckedCreateInput, "id">[] = [
  {
    civilite: "M", nom: "Moreau", prenom: "Lucas", dateNaissance: an(38), lieuNaissance: "Lyon", adresse: "12 rue Victor Hugo", codePostal: "69002", ville: "Lyon",
    telephone: "06 11 22 33 44", email: "lucas.moreau@exemple.fr", numeroPermis: "120569300123", dateObtentionPermis: an(19), categoriePermis: "B", dateValiditePermis: j(3000),
    typePieceIdentite: "CARTE_IDENTITE", numeroPieceIdentite: "X4RTBPFW4", dateValiditePieceIdentite: j(2500), notes: "Client fidèle, loue souvent en mensuel.",
  },
  {
    civilite: "MME", nom: "Haddad", prenom: "Inès", dateNaissance: an(29), adresse: "5 avenue Jean Jaurès", codePostal: "69007", ville: "Lyon",
    telephone: "07 55 66 77 88", email: "ines.haddad@exemple.fr", numeroPermis: "180769300456", dateObtentionPermis: an(8), categoriePermis: "B", dateValiditePermis: j(4000),
    typePieceIdentite: "PASSEPORT", numeroPieceIdentite: "22AB12345", dateValiditePieceIdentite: j(1800),
  },
  {
    civilite: "M", nom: "Amrani", prenom: "Mehdi", dateNaissance: an(21), adresse: "48 cours Gambetta", codePostal: "69003", ville: "Lyon",
    telephone: "06 98 12 34 56", email: "mehdi.amrani@exemple.fr", numeroPermis: "250369300789", dateObtentionPermis: j(-200), categoriePermis: "B",
    dateValiditePermis: j(5000), notes: "Jeune permis : caution doublée.",
  },
  {
    civilite: "MME", nom: "Robert", prenom: "Julie", dateNaissance: an(44), adresse: "3 place Bellecour", codePostal: "69002", ville: "Lyon",
    telephone: "06 44 33 22 11", email: "julie.robert@exemple.fr", numeroPermis: "010269300321", dateObtentionPermis: an(25), categoriePermis: "B", dateValiditePermis: j(2000),
    typePieceIdentite: "CARTE_IDENTITE", numeroPieceIdentite: "Y7QPLM2K9", dateValiditePieceIdentite: j(-30),
  },
  {
    civilite: "M", nom: "Garnier", prenom: "Thomas", dateNaissance: an(51), adresse: "ZA des Platières", codePostal: "69160", ville: "Tassin-la-Demi-Lune",
    telephone: "04 78 00 11 22", email: "contact@garnier-btp.fr", numeroPermis: "950169300654", dateObtentionPermis: an(31), categoriePermis: "B", dateValiditePermis: j(1500),
    entreprise: "Garnier BTP", siretEntreprise: "81234567800019",
  },
  {
    civilite: "M", nom: "Petit", prenom: "Kevin", dateNaissance: an(33), telephone: "06 00 00 00 01", numeroPermis: "100869300999", dateObtentionPermis: an(15),
    dateValiditePermis: j(1000), listeNoire: true, motifListeNoire: "Loyers impayés (450 €) et véhicule rendu très sale en 2025.",
  },
];

// [immat, client, type, statut, départ (jours, heure), retour (jours, heure), options, notes]
type ContratDemo = {
  immat: string;
  client: string;
  type: "JOURNALIERE" | "HEBDOMADAIRE" | "MENSUELLE";
  statut: "RESERVATION" | "CONFIRMEE" | "EN_COURS" | "TERMINEE" | "ANNULEE";
  depart: [number, number];
  retour: [number, number] | { mois: number };
  options?: string[];
  livraison?: number;
  motifAnnulation?: string;
  notes?: string;
};

const CONTRATS_DEMO: ContratDemo[] = [
  { immat: "GK-582-TY", client: "Moreau", type: "MENSUELLE", statut: "TERMINEE", depart: [-125, 10], retour: { mois: 3 } },
  { immat: "GK-582-TY", client: "Haddad", type: "MENSUELLE", statut: "EN_COURS", depart: [-20, 10], retour: { mois: 3 }, notes: "Échéance le 5 de chaque mois." },
  { immat: "GL-145-CP", client: "Robert", type: "JOURNALIERE", statut: "TERMINEE", depart: [-30, 9], retour: [-25, 18], options: ["GPS"] },
  { immat: "GL-145-CP", client: "Amrani", type: "JOURNALIERE", statut: "EN_COURS", depart: [-5, 9], retour: [-1, 18], notes: "Ne répond plus au téléphone depuis hier." },
  { immat: "GL-145-CP", client: "Robert", type: "JOURNALIERE", statut: "CONFIRMEE", depart: [6, 9], retour: [9, 18], options: ["Siège bébé / rehausseur"] },
  { immat: "GB-303-TS", client: "Garnier", type: "JOURNALIERE", statut: "TERMINEE", depart: [-60, 8], retour: [-57, 19], options: ["Conducteur additionnel"], livraison: 40 },
  { immat: "GB-303-TS", client: "Robert", type: "HEBDOMADAIRE", statut: "TERMINEE", depart: [-21, 9], retour: [-11, 9] },
  { immat: "GB-303-TS", client: "Garnier", type: "JOURNALIERE", statut: "CONFIRMEE", depart: [1, 9], retour: [4, 18], options: ["Frais de dossier"] },
  { immat: "GE-204-KN", client: "Moreau", type: "MENSUELLE", statut: "RESERVATION", depart: [3, 10], retour: { mois: 1 } },
  { immat: "GE-204-KN", client: "Amrani", type: "MENSUELLE", statut: "ANNULEE", depart: [1, 10], retour: { mois: 1 }, motifAnnulation: "Le client a trouvé un véhicule ailleurs." },
];

/** Jour J+n à une heure donnée (heure de Paris). */
function jh(n: number, heure: number): Date {
  const p = partiesParis(new Date(Date.now() + n * JOUR));
  return dateDepuisParis(p.annee, p.mois, p.jour, heure, 0);
}

async function chargerLocationDemo(db: PrismaClient) {
  const clients = new Map<string, string>();
  for (const c of CLIENTS_DEMO) {
    const existe = await db.client.findFirst({ where: { nom: c.nom, prenom: c.prenom } });
    clients.set(c.nom, existe?.id ?? (await db.client.create({ data: c })).id);
  }
  const options = await db.optionLocation.findMany();
  const reglages = await db.reglages.findUnique({ where: { id: 1 } });
  const annee = partiesParis(new Date()).annee;

  for (const d of CONTRATS_DEMO) {
    const v = await db.vehicule.findUnique({ where: { immatriculation: d.immat } });
    const clientId = clients.get(d.client);
    if (!v || !clientId || v.statut === "VENDU" || v.statut === "ARCHIVE") continue;
    const depart = jh(d.depart[0], d.depart[1]);
    let retour: Date;
    if (Array.isArray(d.retour)) retour = jh(d.retour[0], d.retour[1]);
    else {
      const p = partiesParis(depart);
      const total = p.annee * 12 + p.mois - 1 + d.retour.mois;
      retour = dateDepuisParis(Math.floor(total / 12), (total % 12) + 1, p.jour, p.heure, 0);
    }
    const tarif = d.type === "JOURNALIERE" ? v.tarifJournalierCentimes : d.type === "HEBDOMADAIRE" ? v.tarifHebdoCentimes : v.tarifMensuelCentimes;
    if (!tarif) continue;
    const opts = (d.options ?? []).map((l) => options.find((o) => o.libelle === l)).filter((o) => o !== undefined);
    const prix = calculerPrixLocation({
      type: d.type, depart, retour, toleranceMinutes: reglages?.toleranceRetardMinutes ?? 60, tarifCentimes: tarif,
      tarifJournalierCentimes: d.type === "HEBDOMADAIRE" ? v.tarifJournalierCentimes : null,
      fraisLivraisonCentimes: d.livraison ? eur(d.livraison) : 0,
      options: opts.map((o) => ({ modeTarif: o.modeTarif, prixCentimes: o.prixCentimes, plafondCentimes: o.plafondCentimes, quantite: 1 })),
    });
    // Conflit avec un contrat déjà saisi (démo rechargée) : on passe
    const conflit = await db.contratLocation.findFirst({
      where: { vehiculeId: v.id, archiveLe: null, statut: { in: ["RESERVATION", "CONFIRMEE", "EN_COURS"] }, departPrevuLe: { lt: retour }, retourPrevuLe: { gt: depart } },
    });
    if (conflit && ["RESERVATION", "CONFIRMEE", "EN_COURS"].includes(d.statut)) continue;

    const compteur = await db.compteur.upsert({ where: { cle: `contrat:${annee}` }, create: { cle: `contrat:${annee}`, valeur: 1 }, update: { valeur: { increment: 1 } } });
    const termine = d.statut === "TERMINEE";
    const enCours = d.statut === "EN_COURS";
    await db.contratLocation.create({
      data: {
        numero: `${reglages?.prefixeContrat ?? "LOC"}-${annee}-${String(compteur.valeur).padStart(4, "0")}`,
        vehiculeId: v.id, clientId, type: d.type, statut: d.statut, departPrevuLe: depart, retourPrevuLe: retour,
        departReelLe: termine || enCours ? depart : null, retourReelLe: termine ? retour : null,
        lieuDepart: "Agence VUCA AUTO", lieuRetour: "Agence VUCA AUTO", livraison: !!d.livraison,
        tarifCentimes: tarif, tarifJournalierCentimes: d.type === "HEBDOMADAIRE" ? v.tarifJournalierCentimes : null,
        dureeFacturee: prix.unites, joursSupplementaires: prix.joursSupplementaires, fraisLivraisonCentimes: prix.fraisLivraisonCentimes,
        prixTotalCentimes: prix.prixTotalCentimes, jourEcheanceMensuelle: d.type === "MENSUELLE" ? 5 : null,
        kmInclusParUnite: d.type === "MENSUELLE" ? v.kmInclusParMois : v.kmInclusParJour, prixKmSupCentimes: v.prixKmSupCentimes,
        cautionCentimes: v.cautionDefautCentimes ?? 0, modeCaution: "EMPREINTE_CB", franchiseCentimes: v.franchiseDefautCentimes,
        statutCaution: termine ? "RESTITUEE" : enCours ? "ENCAISSEE" : "A_ENCAISSER",
        conditionsGenerales: reglages?.conditionsGenerales ?? null, notes: d.notes ?? null,
        annuleLe: d.statut === "ANNULEE" ? j(-2) : null, motifAnnulation: d.motifAnnulation ?? null,
        options: { create: opts.map((o, i) => ({ optionId: o.id, libelle: o.libelle, modeTarif: o.modeTarif, prixCentimes: o.prixCentimes, quantite: 1, totalCentimes: prix.totalOptions[i] ?? 0 })) },
      },
    });
  }
}
