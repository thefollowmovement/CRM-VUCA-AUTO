import { describe, expect, it } from "vitest";
import { CHAMPS_PUBLICS, toPublicVehicle, type EntreeVehiculePublic } from "./vehicule-public";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

// Un véhicule COMPLET tel qu'il existe dans le CRM, avec toutes ses données internes
// (on simule une erreur de programmation qui passerait l'objet Prisma entier).
const internes = {
  prixAchatCentimes: 777777,
  depenses: [{ montantCentimes: 123456, libelle: "Réparation secrète" }],
  coutDeRevient: 901233,
  marge: 345678,
  participations: [{ partenaireId: "p1", montantCentimes: 500000, partenaire: { nom: "Karim Investisseur" } }],
  partsFixes: [{ partenaireId: "p1", pourcentageBp: 5000 }],
  versements: [{ montantCentimes: 222222 }],
  nomVendeur: "Garage Dupont Vendeur",
  provenance: "PARTICULIER",
  lienAnnonce: "https://leboncoin.fr/annonce-achat",
  notes: "Note interne confidentielle",
  notesAchat: "Négocié à la baisse",
  notesVente: "Acheteur pressé",
  vin: "VF3ABCDEF12345678",
  estimations: [{ montantCentimes: 1111111 }],
  fichiers: [{ categorie: "CARTE_GRISE", cleStockage: "vehicules/carte-grise.jpg" }],
  historiqueStatuts: [{ ancienStatut: "EN_PREPARATION" }],
  acheteurNom: "Client Acheteur",
  acheteurTelephone: "0600000000",
  contrats: [{ client: { nom: "Locataire" } }],
  modeRepartition: "PRORATA_INVESTISSEMENT",
  commissionGestionBp: 2000,
  assureur: "Assureur interne",
  numeroPoliceAssurance: "POL-123",
};

const entree = {
  annonce: {
    reference: "VA-0042",
    slug: "peugeot-208-allure-2021-a1b2",
    titre: "Peugeot 208 1.2 PureTech 100 Allure",
    prixAfficheCentimes: 1249000,
    prixNegociable: true,
    puissanceCh: 100,
    description: "Très bon état.",
    equipements: { confort: ["Climatisation"], securite: ["ABS"], multimedia: [], exterieur: [], autres: ["Tapis"], intrus: ["x"] },
    ctAJour: true,
    ctDate: d("2026-05-12"),
    carnetEntretien: true,
    rapportHistovec: false,
    nombreProprietaires: 2,
    premiereMain: false,
    garantieMois: 6,
    garantieTexte: "Moteur et boîte",
    nonFumeur: true,
    reviseAvantVente: true,
    travauxRealises: "Vidange, plaquettes",
    kilometrageVerifie: true,
    sourceKilometrage: "Historique Histovec",
    couvertureId: "photo-2",
    misAJourLe: new Date("2026-10-20T10:00:00Z"),
    ...internes,
  },
  vehicule: {
    marque: "Peugeot",
    modele: "208",
    version: "1.2 PureTech 100 Allure",
    annee: 2021,
    dateMiseEnCirculation: d("2021-03-15"),
    carburant: "ESSENCE",
    boite: "MANUELLE",
    couleur: "Gris",
    nombrePlaces: 5,
    critAir: "CRIT_AIR_1",
    kilometrageActuel: 84500,
    immatriculation: "AB-123-CD",
    statut: "EN_VENTE",
    dateVente: null,
    ...internes,
  },
  photos: [{ id: "photo-1" }, { id: "photo-2" }, { id: "photo-3" }],
  ...internes,
} as unknown as EntreeVehiculePublic;

describe("toPublicVehicle() : aucune donnée interne ne sort", () => {
  const pub = toPublicVehicle(entree, { immatriculationVisible: false });
  const json = JSON.stringify(pub);

  it("ne contient que les champs de la liste blanche", () => {
    expect(Object.keys(pub).sort()).toEqual([...CHAMPS_PUBLICS].sort());
  });
  it("aucun champ interdit, à aucun niveau", () => {
    const interdits = [
      "prixAchat", "depense", "coutDeRevient", "marge", "participation", "partenaire", "investisseur", "versement", "vendeur", "provenance",
      "lienAnnonce", "notes", "notesAchat", "notesVente", "vin", "estimation", "valeurEstimee", "fichiers", "cleStockage", "historique", "acheteur",
      "client", "contrat", "repartition", "commission", "assur", "police", "partsFixes", "intrus",
    ];
    const cles: string[] = [];
    const parcourir = (o: unknown) => {
      if (Array.isArray(o)) o.forEach(parcourir);
      else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { cles.push(k.toLowerCase()); parcourir(v); }
    };
    parcourir(pub);
    for (const i of interdits) expect(cles.some((k) => k.includes(i.toLowerCase())), `champ « ${i} »`).toBe(false);
  });
  it("aucune valeur interne, même recopiée par erreur ailleurs", () => {
    for (const valeur of ["777777", "123456", "901233", "345678", "Karim", "Dupont", "Négocié", "confidentielle", "VF3ABCDEF12345678", "1111111", "carte-grise", "Client Acheteur", "Locataire", "POL-123", "AB-123-CD", "leboncoin"]) {
      expect(json.includes(valeur), `valeur « ${valeur} »`).toBe(false);
    }
  });
  it("immatriculation masquée par défaut, visible seulement si le réglage l'autorise ; VIN jamais", () => {
    expect(pub.immatriculation).toBeNull();
    const visible = toPublicVehicle(entree, { immatriculationVisible: true });
    expect(visible.immatriculation).toBe("AB-123-CD");
    expect(JSON.stringify(visible)).not.toContain("VF3ABCDEF12345678");
  });
  it("données publiques correctes", () => {
    expect(pub).toMatchObject({
      reference: "VA-0042", titre: "Peugeot 208 1.2 PureTech 100 Allure", kilometrage: 84500, carburant: "Essence", boite: "Manuelle", critAir: "Crit'Air 1",
      miseEnCirculation: "2021-03", prixCentimes: 1249000, prixNegociable: true, disponibilite: "DISPONIBLE", places: 5, puissanceCh: 100,
    });
    expect(pub.equipements).toEqual({ confort: ["Climatisation"], securite: ["ABS"], multimedia: [], exterieur: [], autres: ["Tapis"] });
    expect(pub.photos.map((p) => p.id)).toEqual(["photo-2", "photo-1", "photo-3"]); // couverture en premier
    expect(pub.photos[0]!.alt).toBe("Peugeot 208 1.2 PureTech 100 Allure 2021 — photo 1 sur 3");
    expect(pub.confiance.map((c) => c.cle)).toEqual(["ct", "proprietaires", "garantie", "carnet", "revise", "km", "nonFumeur"]);
    expect(pub.confiance[0]!.detail).toBe("Le 12/05/2026");
  });
  it("réservé, puis vendu : prix retiré et date de vente", () => {
    const reserve = toPublicVehicle({ ...entree, vehicule: { ...entree.vehicule, statut: "RESERVE" } }, { immatriculationVisible: false });
    expect(reserve.disponibilite).toBe("RESERVE");
    const vendu = toPublicVehicle({ ...entree, vehicule: { ...entree.vehicule, statut: "VENDU", dateVente: d("2026-10-01") } }, { immatriculationVisible: false });
    expect(vendu).toMatchObject({ disponibilite: "VENDU", prixCentimes: null, prixNegociable: false, vendueLe: "2026-10-01" });
  });
  it("seuls les points de confiance cochés apparaissent", () => {
    const rien = toPublicVehicle(
      { ...entree, annonce: { ...entree.annonce, ctAJour: false, carnetEntretien: false, nombreProprietaires: null, garantieMois: null, nonFumeur: false, reviseAvantVente: false, kilometrageVerifie: false } },
      { immatriculationVisible: false },
    );
    expect(rien.confiance).toEqual([]);
    expect(rien.travauxRealises).toBeNull();
  });
});
