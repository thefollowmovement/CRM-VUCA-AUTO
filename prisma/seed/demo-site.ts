// =====================================================================
//  Démo du site public (Phase S1) : réglages de base, 8 annonces publiées,
//  quelques annonces de véhicules vendus et des statistiques de visite.
//  AUCUN avis client : seuls de vrais avis peuvent être saisis (onglet Site web).
//  Les photos sont des illustrations neutres générées (aucune vraie photo).
// =====================================================================
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import { genererDescription } from "../../src/lib/site/description";
import type { Equipements } from "../../src/lib/site/equipements";
import { ENGAGEMENTS_PROPOSES, HORAIRES_VIDES } from "../../src/lib/site/reglages-defaut";
import { creerSlug, referenceAnnonce, titreParDefaut } from "../../src/lib/site/slug";
import { jourParisISO } from "../../src/lib/dates";
import { chargerVehiculesDemo, eur, j, type Demo } from "./demo";

/** Véhicules supplémentaires « En vente » pour remplir le site de démo. */
function vehiculesSite(): Demo[] {
  const vente = (marque: string, modele: string, version: string, immat: string, annee: number, o: Partial<Demo["donnees"]>, couleur: string, achat: number, ilYa: number): Demo => ({
    donnees: {
      marque, modele, version, immatriculation: immat, annee, typeExploitation: "ACHAT_REVENTE", statut: "EN_VENTE",
      dateAchat: j(-ilYa), prixAchatCentimes: eur(achat), provenance: "PARTICULIER", nombrePlaces: 5, ...o,
    },
    financement: [["VUCA AUTO", achat]],
    couleurIllustration: couleur,
    historique: [["EN_PREPARATION", "EN_VENTE", Math.max(1, ilYa - 10), "Préparation terminée"]],
  });
  return [
    vente("Renault", "Twingo III", "SCe 65 Zen", "FK-065-TW", 2019, { carburant: "ESSENCE", boite: "MANUELLE", couleur: "Bleu dragée", nombrePlaces: 4, kilometrageAchat: 48100, kilometrageActuel: 48200, prixCibleCentimes: eur(7990), dateMiseEnCirculation: new Date(Date.UTC(2019, 3, 12)) }, "#93c5fd", 5600, 25),
    vente("Toyota", "C-HR", "Hybride 122h Edition", "EX-122-CH", 2018, { carburant: "HYBRIDE", boite: "AUTOMATIQUE", couleur: "Blanc nacré", kilometrageAchat: 76300, kilometrageActuel: 76400, prixCibleCentimes: eur(16490), dateMiseEnCirculation: new Date(Date.UTC(2018, 5, 4)) }, "#f1f5f9", 13200, 18),
    vente("Volkswagen", "Polo VI", "1.0 TSI 95 Lounge", "FP-095-VW", 2020, { carburant: "ESSENCE", boite: "MANUELLE", couleur: "Rouge flash", kilometrageAchat: 39500, kilometrageActuel: 39550, prixCibleCentimes: eur(13990), dateMiseEnCirculation: new Date(Date.UTC(2020, 1, 20)) }, "#ef4444", 11000, 12),
    vente("Ford", "Fiesta", "1.0 EcoBoost 100 Titanium", "FD-100-FF", 2019, { carburant: "ESSENCE", boite: "MANUELLE", couleur: "Gris magnétique", kilometrageAchat: 61000, kilometrageActuel: 61100, prixCibleCentimes: eur(10490), dateMiseEnCirculation: new Date(Date.UTC(2019, 8, 30)) }, "#6b7280", 8100, 33),
    vente("Peugeot", "2008", "1.2 PureTech 130 GT Line", "FS-130-PG", 2020, { carburant: "ESSENCE", boite: "AUTOMATIQUE", couleur: "Orange fusion", kilometrageAchat: 52000, kilometrageActuel: 52080, prixCibleCentimes: eur(17990), dateMiseEnCirculation: new Date(Date.UTC(2020, 9, 2)) }, "#fb923c", 14500, 8),
  ];
}

type AnnonceDemo = {
  immat: string;
  photos: number; // nombre total de photos publiques (illustrations)
  puissanceCh: number;
  negociable?: boolean;
  equipements: Partial<Equipements>;
  confiance: Partial<Prisma.AnnonceUncheckedCreateInput>;
  publieeIlYa: number;
};

// Fonction (et non constante) : demo.ts et ce fichier s'importent mutuellement, j() n'existe qu'après chargement.
const annoncesDemo = (): AnnonceDemo[] => [
  { immat: "FG-208-PA", photos: 9, puissanceCh: 100, publieeIlYa: 28, equipements: { confort: ["Climatisation automatique", "Régulateur de vitesse", "Vitres électriques"], securite: ["ABS", "ESP", "Aide au stationnement arrière"], multimedia: ["Écran tactile", "Apple CarPlay", "Android Auto", "Bluetooth"], exterieur: ["Jantes alliage", "Feux LED"] }, confiance: { ctAJour: true, ctDate: j(-40), carnetEntretien: true, rapportHistovec: true, nombreProprietaires: 2, kilometrageVerifie: true, sourceKilometrage: "Factures d'entretien et Histovec" } },
  { immat: "FN-777-DS", photos: 8, puissanceCh: 90, negociable: true, publieeIlYa: 90, equipements: { confort: ["Climatisation", "Limiteur de vitesse", "Banquette rabattable"], securite: ["ABS", "ESP", "Aide au stationnement arrière"], multimedia: ["Écran tactile", "Bluetooth", "Prise USB"], exterieur: ["Barres de toit", "Feux antibrouillard"] }, confiance: { ctAJour: true, ctDate: j(-120), carnetEntretien: true, nonFumeur: true } },
  { immat: "EZ-316-VW", photos: 8, puissanceCh: 115, publieeIlYa: 60, equipements: { confort: ["Climatisation automatique", "Régulateur de vitesse", "Accoudoir central"], securite: ["ABS", "ESP", "Aide au stationnement avant", "Aide au stationnement arrière"], multimedia: ["GPS", "Bluetooth", "Commandes au volant"], exterieur: ["Jantes alliage"] }, confiance: { ctAJour: true, ctDate: j(-200), carnetEntretien: true, reviseAvantVente: true, travauxRealises: "Vidange, filtres et plaquettes avant remplacés." } },
  { immat: "FK-065-TW", photos: 6, puissanceCh: 65, negociable: true, publieeIlYa: 14, equipements: { confort: ["Climatisation", "Vitres électriques"], securite: ["ABS", "ESP", "Fixations Isofix"], multimedia: ["Bluetooth", "Radio DAB"], exterieur: [] }, confiance: { premiereMain: true, nombreProprietaires: 1, nonFumeur: true, ctAJour: true, ctDate: j(-60) } },
  { immat: "EX-122-CH", photos: 9, puissanceCh: 122, publieeIlYa: 10, equipements: { confort: ["Climatisation automatique", "Régulateur adaptatif", "Démarrage sans clé", "Sièges chauffants"], securite: ["Caméra de recul", "Freinage d'urgence automatique", "Maintien dans la voie", "Reconnaissance des panneaux"], multimedia: ["Écran tactile", "GPS", "Bluetooth"], exterieur: ["Jantes alliage", "Phares Full LED", "Vitres arrière surteintées"] }, confiance: { carnetEntretien: true, rapportHistovec: true, garantieMois: 6, garantieTexte: "Garantie mécanique 6 mois (moteur, boîte, pont).", kilometrageVerifie: true, sourceKilometrage: "Carnet d'entretien Toyota" } },
  { immat: "FP-095-VW", photos: 8, puissanceCh: 95, publieeIlYa: 6, equipements: { confort: ["Climatisation", "Régulateur de vitesse", "Vitres électriques"], securite: ["Freinage d'urgence automatique", "Aide au stationnement arrière", "Fixations Isofix"], multimedia: ["Apple CarPlay", "Android Auto", "Compteur numérique"], exterieur: ["Jantes alliage", "Feux LED"] }, confiance: { carnetEntretien: true, nombreProprietaires: 1, premiereMain: true, ctAJour: true, ctDate: j(-30) } },
  { immat: "FD-100-FF", photos: 5, puissanceCh: 100, negociable: true, publieeIlYa: 20, equipements: { confort: ["Climatisation automatique", "Sièges chauffants", "Volant chauffant"], securite: ["ABS", "ESP", "Aide au stationnement arrière"], multimedia: ["GPS", "Bluetooth", "Commandes au volant"], exterieur: ["Jantes alliage"] }, confiance: { ctAJour: true, ctDate: j(-90), reviseAvantVente: true, travauxRealises: "Courroie de distribution remplacée à 60 000 km." } },
  { immat: "FS-130-PG", photos: 9, puissanceCh: 130, publieeIlYa: 3, equipements: { confort: ["Climatisation automatique", "Régulateur adaptatif", "Accès sans clé", "Toit panoramique"], securite: ["Caméra de recul", "Surveillance des angles morts", "Freinage d'urgence automatique"], multimedia: ["Écran tactile", "GPS", "Recharge sans fil", "Compteur numérique"], exterieur: ["Phares Full LED", "Jantes alliage", "Vitres arrière surteintées"] }, confiance: { carnetEntretien: true, rapportHistovec: true, garantieMois: 12, garantieTexte: "Garantie constructeur jusqu'en octobre 2027.", kilometrageVerifie: true, sourceKilometrage: "Histovec" } },
];

/** Couleur des illustrations des véhicules de démo déjà créés (demo.ts). */
const COULEURS_EXISTANTS: Record<string, string> = { "FG-208-PA": "#9ca3af", "FN-777-DS": "#ea580c", "EZ-316-VW": "#1e3a8a" };

/** Jour calendaire de Paris (même règle que src/server/site/statistiques.ts). */
const jourStat = (date: Date) => new Date(`${jourParisISO(date)}T00:00:00Z`);

/** Véhicules vendus dont l'annonce reste visible (badge « Vendu », sans prix). */
const VENDUS = ["EV-930-PG", "EM-283-CT", "FA-118-BM"];

// ---------------------------------------------------------------------
//  Illustrations neutres au format 4:3 (formes simples, aucun texte)
// ---------------------------------------------------------------------
const FONDS = ["#eef2f7", "#f5f1ea", "#e9f0ec", "#f1eef6", "#eef4f8", "#f7f3ee", "#edf1f4", "#f4f0f0", "#eff3ea"];

function scene(couleur: string, n: number): string {
  const fond = FONDS[n % FONDS.length];
  const roue = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1f2937"/><circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="#9ca3af"/>`;
  const sol = `<rect y="700" width="1200" height="200" fill="#cbd5e1"/>`;
  switch (n % 8) {
    case 0: // profil
    case 1: { // profil inversé
      const t = n % 8 === 1 ? `transform="translate(1200 0) scale(-1 1)"` : "";
      return `${sol}<g ${t}><path d="M170 640 Q180 550 290 532 L430 450 Q480 420 560 418 L780 418 Q860 420 920 470 L1010 535 Q1080 550 1070 640 Z" fill="${couleur}" stroke="#1f2937" stroke-width="6"/>
        <path d="M455 462 L560 440 L650 440 L650 528 L400 528 Z M680 440 L780 440 Q840 442 890 498 L900 528 L680 528 Z" fill="#bfdbfe" stroke="#1f2937" stroke-width="5"/>${roue(340, 650, 66)}${roue(900, 650, 66)}</g>`;
    }
    case 2: // face avant
      return `${sol}<rect x="300" y="400" width="600" height="250" rx="60" fill="${couleur}" stroke="#1f2937" stroke-width="6"/>
        <path d="M380 400 L440 280 L760 280 L820 400 Z" fill="#bfdbfe" stroke="#1f2937" stroke-width="6"/>
        <ellipse cx="390" cy="480" rx="50" ry="26" fill="#fef9c3" stroke="#1f2937" stroke-width="4"/><ellipse cx="810" cy="480" rx="50" ry="26" fill="#fef9c3" stroke="#1f2937" stroke-width="4"/>
        <rect x="500" y="540" width="200" height="50" rx="12" fill="#374151"/><rect x="320" y="640" width="90" height="70" rx="14" fill="#1f2937"/><rect x="790" y="640" width="90" height="70" rx="14" fill="#1f2937"/>`;
    case 3: // arrière
      return `${sol}<rect x="300" y="400" width="600" height="250" rx="60" fill="${couleur}" stroke="#1f2937" stroke-width="6"/>
        <path d="M390 400 L450 290 L750 290 L810 400 Z" fill="#94a3b8" stroke="#1f2937" stroke-width="6"/>
        <rect x="330" y="450" width="110" height="40" rx="10" fill="#dc2626"/><rect x="760" y="450" width="110" height="40" rx="10" fill="#dc2626"/>
        <rect x="520" y="560" width="160" height="40" rx="6" fill="#f8fafc" stroke="#1f2937" stroke-width="3"/><rect x="320" y="640" width="90" height="70" rx="14" fill="#1f2937"/><rect x="790" y="640" width="90" height="70" rx="14" fill="#1f2937"/>`;
    case 4: // tableau de bord
      return `<rect width="1200" height="900" fill="#d6dde6"/><path d="M0 520 Q600 380 1200 520 L1200 900 L0 900 Z" fill="#334155"/>
        <rect x="560" y="430" width="260" height="150" rx="16" fill="#0f172a" stroke="#64748b" stroke-width="4"/><rect x="580" y="450" width="220" height="110" rx="8" fill="#1e3a5f"/>
        <circle cx="380" cy="600" r="150" fill="none" stroke="#111827" stroke-width="34"/><circle cx="380" cy="600" r="40" fill="#111827"/><path d="M240 600 L520 600" stroke="#111827" stroke-width="26"/>`;
    case 5: // jante
      return `<rect width="1200" height="900" fill="${fond}"/><circle cx="600" cy="450" r="330" fill="#111827"/><circle cx="600" cy="450" r="230" fill="#d1d5db" stroke="#6b7280" stroke-width="8"/>
        ${[0, 72, 144, 216, 288].map((a) => `<rect x="585" y="240" width="30" height="210" rx="12" fill="#9ca3af" transform="rotate(${a} 600 450)"/>`).join("")}<circle cx="600" cy="450" r="55" fill="${couleur}" stroke="#374151" stroke-width="6"/>`;
    case 6: // sièges
      return `<rect width="1200" height="900" fill="#e5e7eb"/><rect x="0" y="700" width="1200" height="200" fill="#9ca3af"/>
        <rect x="250" y="220" width="280" height="420" rx="70" fill="#374151"/><rect x="230" y="560" width="320" height="170" rx="40" fill="#4b5563"/>
        <rect x="670" y="220" width="280" height="420" rx="70" fill="#374151"/><rect x="650" y="560" width="320" height="170" rx="40" fill="#4b5563"/>
        <rect x="320" y="160" width="140" height="90" rx="30" fill="#4b5563"/><rect x="740" y="160" width="140" height="90" rx="30" fill="#4b5563"/>`;
    default: // coffre
      return `${sol}<rect x="260" y="330" width="680" height="380" rx="40" fill="${couleur}" stroke="#1f2937" stroke-width="6"/>
        <rect x="320" y="390" width="560" height="270" rx="20" fill="#1f2937"/><rect x="360" y="560" width="480" height="90" rx="10" fill="#374151"/>
        <path d="M300 330 L360 160 L840 160 L900 330 Z" fill="${couleur}" stroke="#1f2937" stroke-width="6" opacity="0.9"/>`;
  }
}

async function illustrationSite(couleur: string, n: number): Promise<Buffer> {
  const fond = FONDS[n % FONDS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="${fond}"/>${scene(couleur, n)}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer();
}

async function photoVehicule(db: PrismaClient, vehiculeId: string, contenu: Buffer, ordre: number, ordrePublic: number) {
  const racine = path.resolve(process.env.STORAGE_DIR ?? "./storage");
  const cle = `demo/${randomUUID()}.jpg`;
  await mkdir(path.join(racine, "demo"), { recursive: true });
  await writeFile(path.join(racine, cle), contenu);
  return db.fichier.create({
    data: {
      categorie: "PHOTO_VEHICULE", cleStockage: cle, nomOriginal: "illustration.jpg", typeMime: "image/jpeg", tailleOctets: contenu.length,
      largeur: 1200, hauteur: 900, ordre, vehiculeId, publique: true, ordrePublic,
    },
  });
}

async function nouvelleAnnonce(db: PrismaClient, v: { id: string; marque: string; modele: string; version: string | null; annee: number | null }, data: Omit<Prisma.AnnonceUncheckedCreateInput, "vehiculeId" | "reference" | "slug" | "titre">) {
  const c = await db.compteur.upsert({ where: { cle: "annonce" }, create: { cle: "annonce", valeur: 1 }, update: { valeur: { increment: 1 } } });
  return db.annonce.create({ data: { vehiculeId: v.id, reference: referenceAnnonce(c.valeur), slug: creerSlug(v, v.id), titre: titreParDefaut(v), ...data } });
}

export async function chargerSiteDemo(db: PrismaClient) {
  // 1. Réglages : uniquement des valeurs neutres. Numéro WhatsApp réservé aux fictions (ARCEP) : à remplacer.
  await db.reglagesSite.upsert({
    where: { id: 1 },
    create: { id: 1, horaires: HORAIRES_VIDES, engagements: ENGAGEMENTS_PROPOSES },
    update: {},
  });
  await db.reglagesSite.update({
    where: { id: 1 },
    data: {
      slogan: "Des voitures d'occasion choisies avec soin.",
      whatsapp: "+33639980000",
      delaiReponse: "Réponse rapide en journée",
      horaires: HORAIRES_VIDES.map((h, i) => ({ ...h, ouvert: i < 6, plages: i < 5 ? "9h – 12h, 14h – 19h" : i === 5 ? "10h – 17h" : "" })),
      moyensPaiement: ["Virement bancaire", "Chèque de banque"],
    },
  });

  // 2. Véhicules en vente supplémentaires
  await chargerVehiculesDemo(db, vehiculesSite());

  // 3. Annonces publiées avec photos publiques
  for (const a of annoncesDemo()) {
    const v = await db.vehicule.findUnique({
      where: { immatriculation: a.immat },
      select: { id: true, marque: true, modele: true, version: true, annee: true, statut: true, kilometrageActuel: true, carburant: true, boite: true, couleur: true, nombrePlaces: true, dateMiseEnCirculation: true, prixCibleCentimes: true, annonce: { select: { id: true } }, fichiers: { where: { categorie: "PHOTO_VEHICULE" }, select: { id: true } } },
    });
    if (!v || v.annonce || !["EN_VENTE", "RESERVE"].includes(v.statut)) continue;
    const couleur = vehiculesSite().find((d) => d.donnees.immatriculation === a.immat)?.couleurIllustration ?? COULEURS_EXISTANTS[a.immat] ?? "#9ca3af";
    // La photo d'illustration existante devient la 1re photo publique, puis des vues complémentaires
    let rang = 0;
    for (const f of v.fichiers) await db.fichier.update({ where: { id: f.id }, data: { publique: true, ordrePublic: rang++ } });
    const photos: string[] = v.fichiers.map((f) => f.id);
    for (let n = 1; rang < a.photos; n++) photos.push((await photoVehicule(db, v.id, await illustrationSite(couleur, n), 10 + n, rang++)).id);

    const equipements: Equipements = { confort: [], securite: [], multimedia: [], exterieur: [], autres: [], ...a.equipements };
    const c = a.confiance;
    const description = genererDescription({
      marque: v.marque, modele: v.modele, version: v.version, annee: v.annee, dateMiseEnCirculation: v.dateMiseEnCirculation, kilometrage: v.kilometrageActuel,
      carburant: v.carburant, boite: v.boite, puissanceCh: a.puissanceCh, couleur: v.couleur, nombrePlaces: v.nombrePlaces, equipements,
      ctAJour: !!c.ctAJour, ctDate: (c.ctDate as Date | undefined) ?? null, carnetEntretien: !!c.carnetEntretien, rapportHistovec: !!c.rapportHistovec,
      premiereMain: !!c.premiereMain, nombreProprietaires: (c.nombreProprietaires as number | undefined) ?? null, garantieMois: (c.garantieMois as number | undefined) ?? null,
      nonFumeur: !!c.nonFumeur, reviseAvantVente: !!c.reviseAvantVente, travauxRealises: (c.travauxRealises as string | undefined) ?? null,
    });
    const publieeLe = new Date(j(-a.publieeIlYa).getTime() + 8 * 3_600_000); // 10 h, heure de Paris
    await nouvelleAnnonce(db, v, {
      publiee: true, publieeLe, misAJourLe: publieeLe, prixAfficheCentimes: v.prixCibleCentimes, prixNegociable: !!a.negociable, puissanceCh: a.puissanceCh,
      description, equipements, couvertureId: photos[0] ?? null, ...c,
    });
  }

  // 4. Véhicules vendus : annonce retirée, page conservée (badge « Vendu »)
  for (const immat of VENDUS) {
    const v = await db.vehicule.findUnique({
      where: { immatriculation: immat },
      select: { id: true, marque: true, modele: true, version: true, annee: true, dateVente: true, prixCibleCentimes: true, annonce: { select: { id: true } }, fichiers: { where: { categorie: "PHOTO_VEHICULE" }, select: { id: true } } },
    });
    if (!v || v.annonce || !v.dateVente) continue;
    for (const [i, f] of v.fichiers.entries()) await db.fichier.update({ where: { id: f.id }, data: { publique: true, ordrePublic: i } });
    const publieeLe = new Date(v.dateVente.getTime() - 45 * 86_400_000);
    await nouvelleAnnonce(db, v, { publiee: false, publieeLe, depublieeLe: v.dateVente, misAJourLe: v.dateVente, prixAfficheCentimes: v.prixCibleCentimes, couvertureId: v.fichiers[0]?.id ?? null });
  }

  // 5. Statistiques de visite des 30 derniers jours (valeurs déterministes)
  const annonces = await db.annonce.findMany({ where: { publiee: true }, select: { id: true }, orderBy: { reference: "asc" } });
  const lignes: Prisma.StatistiqueSiteCreateManyInput[] = [];
  for (let d = 0; d < 30; d++) {
    const jour = jourStat(new Date(Date.now() - d * 86_400_000));
    lignes.push({ jour, type: "VUE_SITE", cle: "site", compte: 40 + ((d * 17) % 35) });
    annonces.forEach((a, i) => {
      const vues = 3 + ((d * 7 + i * 11) % 14);
      lignes.push({ jour, type: "VUE_ANNONCE", cle: a.id, annonceId: a.id, compte: vues });
      const clics = (d + i) % 4 === 0 ? 1 + (i % 2) : 0;
      if (clics) lignes.push({ jour, type: "CLIC_WHATSAPP", cle: a.id, annonceId: a.id, compte: clics });
    });
  }
  await db.statistiqueSite.createMany({ data: lignes, skipDuplicates: true });
}
