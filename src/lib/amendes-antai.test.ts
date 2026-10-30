import { describe, expect, it } from "vitest";
import { dateDepuisParis } from "@/lib/dates";
import { COLONNES_CSV_ANTAI, ligneCsvAntai, lireDateDesignation, societeAntai, versAmendeAntai, type AmendeSource } from "./amendes-antai";
import { etatEcheance } from "./calculs/amendes";

const jour = (s: string) => new Date(`${s}T00:00:00Z`);
const client = {
  civilite: "M", nom: "Dupont", prenom: "Jean", dateNaissance: jour("1990-05-14"), lieuNaissance: "Paris", paysNaissance: "France",
  adresse: "5 avenue de la République", adresseComplement: "Bât B", codePostal: "75011", ville: "Paris", pays: "France",
  numeroPermis: "123456789012", dateDelivrancePermis: null, dateObtentionPermis: jour("2012-03-01"), paysDelivrancePermis: "France", email: "jean.dupont@example.com",
};
const pv: AmendeSource = {
  id: "cm123", numeroAvis: "1234567890", typeAvis: "CONTRAVENTION", dateAvis: jour("2026-10-02"), infractionLe: dateDepuisParis(2026, 9, 21, 14, 32), heureInconnue: false,
  immatriculationLue: "AB-123-CD", vehicule: null, nature: "Excès de vitesse < 20 km/h", montantCentimes: 6800, dateLimite: jour("2026-11-16"),
  contrat: { id: "c55", numero: "LOC-2026-055" }, client,
};

describe("format de désignation ANTAI (contrat de l'extension)", () => {
  it("PV complet : exactement le JSON attendu", () => {
    expect(versAmendeAntai(pv)).toEqual({
      id: "cm123", numero_avis: "1234567890", type_avis: "contravention", date_avis: "2026-10-02", date_infraction: "2026-09-21T14:32",
      immatriculation: "AB-123-CD", nature: "Excès de vitesse < 20 km/h", montant: 68, date_limite_designation: "2026-11-16",
      contrat: { id: "c55", reference: "LOC-2026-055" },
      conducteur: {
        civilite: "M", nom: "DUPONT", prenom: "Jean", date_naissance: "1990-05-14", lieu_naissance: "Paris", pays_naissance: "France",
        adresse_ligne1: "5 avenue de la République", adresse_ligne2: "Bât B", code_postal: "75011", ville: "Paris", pays: "France",
        numero_permis: "123456789012", date_delivrance_permis: "2012-03-01", pays_delivrance_permis: "France", email: "jean.dupont@example.com",
      },
    });
  });
  it("champs inconnus = \"\" (jamais absents), heure inconnue → jour seul", () => {
    const a = versAmendeAntai({ ...pv, numeroAvis: null, typeAvis: null, heureInconnue: true, montantCentimes: null, contrat: null, client: null, immatriculationLue: null, vehicule: { immatriculation: "XY-987-ZT" } });
    expect(a.date_infraction).toBe("2026-09-21");
    expect(a.numero_avis).toBe("");
    expect(a.montant).toBe("");
    expect(a.contrat).toEqual({ id: "", reference: "" });
    expect(a.immatriculation).toBe("XY-987-ZT");
    expect(Object.values(a.conducteur).every((v) => v === "")).toBe(true);
  });
  it("société : réglages Amendes, sinon Société", () => {
    const r = { societeNom: "VUCA AUTO", societeAdresse: "12 rue Exemple", societeCodePostal: "92390", societeVille: "Villeneuve-la-Garenne", societeEmail: "contact@vuca-auto.fr", amendesRaisonSociale: null, amendesAdresse: null, amendesAdresseComplement: null, amendesCodePostal: null, amendesVille: null, amendesEmail: "antai@vuca-auto.fr" };
    expect(societeAntai(r)).toEqual({ raison_sociale: "VUCA AUTO", adresse_ligne1: "12 rue Exemple", adresse_ligne2: "", code_postal: "92390", ville: "Villeneuve-la-Garenne", email: "antai@vuca-auto.fr" });
  });
  it("ligne CSV : autant de cellules que de colonnes, montant à la française", () => {
    const l = ligneCsvAntai(versAmendeAntai(pv), societeAntai({ societeNom: "VUCA AUTO", societeAdresse: null, societeCodePostal: null, societeVille: null, societeEmail: null, amendesRaisonSociale: null, amendesAdresse: null, amendesAdresseComplement: null, amendesCodePostal: null, amendesVille: null, amendesEmail: null }));
    expect(l).toHaveLength(COLONNES_CSV_ANTAI.length);
    expect(l[COLONNES_CSV_ANTAI.indexOf("montant")]).toBe("68,00");
    expect(l[COLONNES_CSV_ANTAI.indexOf("conducteur_nom")]).toBe("DUPONT");
  });
});

describe("échéance de désignation", () => {
  const limite = jour("2026-11-16");
  it("rouge si dépassée, orange sous 10 jours, rien une fois désigné", () => {
    expect(etatEcheance(limite, "A_DESIGNER", "2026-11-17")).toBe("depassee");
    expect(etatEcheance(limite, "A_DESIGNER", "2026-11-16")).toBe("proche");
    expect(etatEcheance(limite, "A_VALIDER", "2026-11-07")).toBe("proche");
    expect(etatEcheance(limite, "A_VALIDER", "2026-11-06")).toBe("ok");
    expect(etatEcheance(limite, "CONDUCTEUR_DESIGNE", "2026-12-01")).toBeNull();
    expect(etatEcheance(null, "A_DESIGNER", "2026-12-01")).toBeNull();
  });
});

describe("date de désignation reçue de l'extension", () => {
  const maintenant = new Date("2026-10-24T08:00:00Z");
  it("absente → maintenant", () => {
    expect(lireDateDesignation(undefined, maintenant)).toBe(maintenant);
    expect(lireDateDesignation("", maintenant)).toBe(maintenant);
  });
  it("« AAAA-MM-JJTHH:MM » = heure de Paris", () => {
    expect(lireDateDesignation("2026-10-24T09:30", maintenant)?.toISOString()).toBe("2026-10-24T07:30:00.000Z");
    expect(lireDateDesignation("2026-01-15T09:30", maintenant)?.toISOString()).toBe("2026-01-15T08:30:00.000Z");
    expect(lireDateDesignation("2026-10-24T09:30:15", maintenant)?.toISOString()).toBe("2026-10-24T07:30:00.000Z");
  });
  it("ISO avec fuseau", () => {
    expect(lireDateDesignation("2026-10-24T07:30:00Z", maintenant)?.toISOString()).toBe("2026-10-24T07:30:00.000Z");
    expect(lireDateDesignation("2026-10-24T09:30+02:00", maintenant)?.toISOString()).toBe("2026-10-24T07:30:00.000Z");
  });
  it("refuse les valeurs invalides", () => {
    for (const v of [12, {}, "24/10/2026", "2026-02-31T10:00", "2026-10-24", "2026-10-24T25:00", "2026-10-27T10:00", "1999-12-31T10:00", "demain"]) {
      expect(lireDateDesignation(v, maintenant)).toBeNull();
    }
  });
});
