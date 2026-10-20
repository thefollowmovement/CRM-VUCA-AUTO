import { describe, expect, it } from "vitest";
import { horairesSchema, jsonLdConcession, jsonLdVoiture, lirePlages, serialiserJsonLd } from "./donnees-structurees";
import { HORAIRES_VIDES } from "./reglages-defaut";
import type { ReglagesPublics } from "./reglages-publics";
import type { VehiculePublic } from "./vehicule-public";

const vehicule: VehiculePublic = {
  reference: "VA-0001", slug: "peugeot-208-allure-2020-ab12", titre: "Peugeot 208 1.2 PureTech 100 Allure", marque: "Peugeot", modele: "208",
  version: "1.2 PureTech 100 Allure", annee: 2020, miseEnCirculation: "2020-03", kilometrage: 64350, carburant: "Essence", boite: "Manuelle",
  puissanceCh: 100, critAir: "Crit'Air 1", places: 5, couleur: "Gris", prixCentimes: 1149000, prixNegociable: false, disponibilite: "DISPONIBLE",
  description: "**Très bon état**\n- Climatisation", equipements: { confort: [], securite: [], multimedia: [], exterieur: [], autres: [] },
  confiance: [], travauxRealises: null, photos: [], immatriculation: null, misAJourLe: "2026-10-01T10:00:00.000Z", vendueLe: null,
};

const reglages = {
  nom: "VUCA AUTO", slogan: "Occasions choisies", telephone: "01 23 45 67 89", email: null, adresse: "1 rue de la Paix\n75002 Paris",
  lienGoogleMaps: null, horaires: HORAIRES_VIDES.map((h, i) => (i === 0 ? { ...h, ouvert: true, plages: "9h – 12h, 14h30 - 19h" } : i === 6 ? { ...h, ouvert: true, plages: "Sur rendez-vous" } : h)),
  reseaux: { instagram: "https://instagram.com/vuca" }, moyensPaiement: ["Virement bancaire"], seoDescription: null,
} as unknown as ReglagesPublics;

describe("données structurées (JSON-LD)", () => {
  it("horaires : plages lues dans le texte libre", () => {
    expect(lirePlages("9h – 12h, 14h30 - 19h")).toEqual([{ opens: "09:00", closes: "12:00" }, { opens: "14:30", closes: "19:00" }]);
    expect(lirePlages("10:00-17:00")).toEqual([{ opens: "10:00", closes: "17:00" }]);
    expect(lirePlages("Sur rendez-vous")).toEqual([]);
    expect(horairesSchema(reglages.horaires)).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Monday", opens: "09:00", closes: "12:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Monday", opens: "14:30", closes: "19:00" },
    ]);
  });

  it("concession : AutoDealer sans champ vide", () => {
    const j = jsonLdConcession(reglages, { url: "https://vuca-auto.fr", logo: null, image: null }) as Record<string, unknown>;
    expect(j["@type"]).toBe("AutoDealer");
    expect(j.address).toEqual({ "@type": "PostalAddress", streetAddress: "1 rue de la Paix, 75002 Paris", addressCountry: "FR" });
    expect(j.sameAs).toEqual(["https://instagram.com/vuca"]);
    expect("email" in j).toBe(false);
    expect("logo" in j).toBe(false);
  });

  it("voiture : Car + Offer (prix en euros, disponibilité, kilométrage)", () => {
    const j = jsonLdVoiture(vehicule, { url: "https://vuca-auto.fr/voitures/x", images: ["https://vuca-auto.fr/photos/a/1280"], vendeur: { nom: "VUCA AUTO", url: "https://vuca-auto.fr" } }) as Record<string, any>;
    expect(j["@type"]).toBe("Car");
    expect(j.offers).toMatchObject({ "@type": "Offer", price: 11490, priceCurrency: "EUR", availability: "https://schema.org/InStock" });
    expect(j.mileageFromOdometer).toEqual({ "@type": "QuantitativeValue", value: 64350, unitCode: "KMT" });
    expect(j.fuelType).toBe("Gasoline");
    expect(j.vehicleModelDate).toBe("2020");
    expect(j.description).toBe("Très bon état\nClimatisation");
    const vendu = jsonLdVoiture({ ...vehicule, disponibilite: "VENDU", prixCentimes: null }, { url: "u", images: [], vendeur: { nom: "V", url: "u" } }) as Record<string, any>;
    expect(vendu.offers.availability).toBe("https://schema.org/SoldOut");
    expect("price" in vendu.offers).toBe(false);
    expect("image" in vendu).toBe(false);
  });

  it("sérialisation sûre dans une balise script", () => {
    expect(serialiserJsonLd({ t: "</script><b>&" })).toBe('{"t":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026"}');
  });
});
