import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { genererDescription } from "./description";
import { nombreEquipements, normaliserEquipements } from "./equipements";
import { kmSite, prixSite } from "./format";
import { creerSlug, finition, referenceAnnonce, slugifier, titreParDefaut } from "./slug";
import { decouperTexteRiche, nettoyerTexteRiche, segmenter } from "./texte-riche";
import { afficherNumero, lienWhatsApp, normaliserNumero, remplirMessage } from "./whatsapp";

const esp = (s: string) => s.replace(/[  ]/g, " ");

describe("formats", () => {
  it("prix et kilométrage", () => {
    expect(esp(prixSite(1249000))).toBe("12 490 €");
    expect(esp(prixSite(1249050))).toBe("12 491 €");
    expect(prixSite(null)).toBe("Prix sur demande");
    expect(esp(kmSite(84500))).toBe("84 500 km");
  });
});

describe("slug et référence", () => {
  it("slug lisible et unique", () => {
    expect(slugifier("Citroën C3 « Shine » 1.2")).toBe("citroen-c3-shine-1-2");
    expect(finition("1.2 PureTech 100 Allure")).toBe("Allure");
    expect(finition("TCe 90")).toBe("TCe");
    expect(creerSlug({ marque: "Peugeot", modele: "208", version: "1.2 PureTech 100 Allure", annee: 2021 }, "clxyz12a1b2")).toBe("peugeot-208-allure-2021-a1b2");
    expect(creerSlug({ marque: "Škoda", modele: "Octavia", version: null, annee: null }, "abc")).toBe("skoda-octavia-abc");
    expect(titreParDefaut({ marque: "Peugeot", modele: "208", version: "1.2 PureTech 100 Allure" })).toBe("Peugeot 208 1.2 PureTech 100 Allure");
    expect(referenceAnnonce(42)).toBe("VA-0042");
  });
});

describe("WhatsApp", () => {
  it("numéro au format international", () => {
    expect(normaliserNumero("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normaliserNumero("06.12.34.56.78")).toBe("+33612345678");
    expect(normaliserNumero("0033612345678")).toBe("+33612345678");
    expect(normaliserNumero("12345")).toBeNull();
    expect(normaliserNumero("")).toBeNull();
    expect(afficherNumero("+33612345678")).toBe("+33 6 12 34 56 78");
  });
  it("variables remplacées, encodage du lien", () => {
    const modele = "Bonjour, je suis intéressé par la {marque} {modele} {annee} à {prix} ({lien}). Est-elle toujours disponible ?";
    const message = remplirMessage(modele, { marque: "Peugeot", modele: "208", annee: 2021, prix: "12 490 €", lien: "https://vuca-auto.fr/voitures/peugeot-208-allure-2021-a1b2" });
    expect(message).toBe("Bonjour, je suis intéressé par la Peugeot 208 2021 à 12 490 € (https://vuca-auto.fr/voitures/peugeot-208-allure-2021-a1b2). Est-elle toujours disponible ?");
    const lien = lienWhatsApp("+33 6 12 34 56 78", message)!;
    expect(lien.startsWith("https://wa.me/33612345678?text=")).toBe(true);
    expect(decodeURIComponent(lien.split("text=")[1]!)).toBe(message);
    expect(lien).not.toMatch(/\s/); // aucun espace brut dans le lien
    expect(lienWhatsApp("invalide", "x")).toBeNull();
  });
  it("variable manquante : supprimée proprement ; variable inconnue : laissée", () => {
    expect(remplirMessage("La {marque} {version} ({lien}) ?", { marque: "Dacia" })).toBe("La Dacia ?");
    expect(remplirMessage("Bonjour {inconnue}", {})).toBe("Bonjour {inconnue}");
  });
});

describe("texte riche (gras et listes uniquement)", () => {
  it("gras, listes, paragraphes", () => {
    expect(segmenter("Très **bon** état")).toEqual([{ texte: "Très ", gras: false }, { texte: "bon", gras: true }, { texte: " état", gras: false }]);
    expect(segmenter("a **b")).toEqual([{ texte: "a ", gras: false }, { texte: "**b", gras: false }]);
    const blocs = decouperTexteRiche("Intro\nsuite\n\n- un\n- **deux**\nFin");
    expect(blocs.map((b) => b.type)).toEqual(["paragraphe", "liste", "paragraphe"]);
    expect(blocs[1]).toEqual({ type: "liste", items: [[{ texte: "un", gras: false }], [{ texte: "deux", gras: true }]] });
  });
  it("le HTML reste du texte (jamais interprété)", () => {
    const blocs = decouperTexteRiche("<script>alert(1)</script>");
    expect(blocs).toEqual([{ type: "paragraphe", lignes: [[{ texte: "<script>alert(1)</script>", gras: false }]] }]);
    expect(nettoyerTexteRiche("a\r\n\n\n\nb\u0007")).toBe("a\n\nb");
  });
});

describe("équipements et description générée", () => {
  it("normalisation des équipements", () => {
    const e = normaliserEquipements({ confort: ["Climatisation", "Climatisation", " ", 3], securite: "ABS", autres: ["Tapis"] });
    expect(e).toEqual({ confort: ["Climatisation"], securite: [], multimedia: [], exterieur: [], autres: ["Tapis"] });
    expect(nombreEquipements(e)).toBe(2);
    expect(normaliserEquipements(null).confort).toEqual([]);
  });
  it("description factuelle à partir des caractéristiques", () => {
    const texte = genererDescription({
      marque: "Peugeot", modele: "208", version: "1.2 PureTech 100 Allure", annee: 2021, dateMiseEnCirculation: new Date("2021-03-15T00:00:00Z"),
      kilometrage: 84500, carburant: "ESSENCE", boite: "MANUELLE", puissanceCh: 100, couleur: "Gris", nombrePlaces: 5,
      equipements: normaliserEquipements({ confort: ["Climatisation"], securite: ["ABS"] }),
      ctAJour: true, ctDate: new Date("2026-05-12T00:00:00Z"), carnetEntretien: true, rapportHistovec: false, premiereMain: true, nombreProprietaires: null,
      garantieMois: null, nonFumeur: false, reviseAvantVente: true, travauxRealises: "Vidange.",
    });
    expect(esp(texte)).toContain("Peugeot 208 1.2 PureTech 100 Allure, de 2021, 84 500 km, essence, boîte manuelle, 100 ch.");
    expect(texte).toContain("Première mise en circulation : 03/2021.");
    expect(texte).toContain("- Première main");
    expect(texte).toContain("- Contrôle technique à jour (le 12/05/2026)");
    expect(texte).toContain("- Révisé avant la vente : Vidange");
    expect(texte).toContain("- Climatisation");
    expect(texte).not.toMatch(/exceptionnel|incroyable|parfait|unique|imbattable/i);
    expect(texte).not.toContain("Garantie"); // non cochée → absente
  });
});

describe("cloisonnement du code public", () => {
  // Les pages et routes publiques ne doivent jamais lire la base directement :
  // elles passent par src/server/site (qui n'expose que toPublicVehicle et les réglages publics).
  const racine = path.resolve(__dirname, "../../..");
  const dossiers = ["src/app/(site)", "src/app/api/site", "src/components/site"];
  const fichiers = (d: string): string[] => {
    const abs = path.join(racine, d);
    try {
      return readdirSync(abs).flatMap((n) => (statSync(path.join(abs, n)).isDirectory() ? fichiers(path.join(d, n)) : /\.(ts|tsx)$/.test(n) ? [path.join(d, n)] : []));
    } catch {
      return [];
    }
  };
  it("aucun import de la base, des requêtes ou des actions du CRM", () => {
    const interdits = [/from ["']@\/lib\/db["']/, /generated\/prisma/, /from ["']@\/server\/(requetes|actions)\//, /from ["']@\/lib\/reglages["']/];
    const tous = dossiers.flatMap(fichiers);
    expect(tous.length).toBeGreaterThan(0);
    for (const f of tous) {
      const code = readFileSync(path.join(racine, f), "utf8");
      for (const r of interdits) expect(r.test(code), `${f} importe ${r}`).toBe(false);
    }
  });
});

describe("finition (slug)", () => {
  it.each([
    ["1.5 BlueHDi 130 GT Line", "GT Line"],
    ["Stepway TCe 90", "Stepway TCe"],
    ["118i M Sport", "M Sport"],
    ["TCe 90 Intens", "Intens"],
    ["Grande Autonomie AWD", "Grande Autonomie AWD"],
    ["", null],
  ])("%s → %s", (version, attendu) => expect(finition(version)).toBe(attendu));
});
