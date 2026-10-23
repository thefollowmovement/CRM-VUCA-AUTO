// =====================================================================
//  Format « désignation ANTAI » d'un PV (contrat JSON de l'extension
//  Chrome vuca-antai-extension, prompt du 23/10/2026 §8) — pur, testé.
//  Utilisé par l'export CSV (A2) et par l'API /api/antai (A3).
//  Règle : un champ inconnu vaut "" (jamais absent), dates ISO.
// =====================================================================
import { dateDelivranceEffective } from "@/lib/calculs/amendes";
import { dateVersSaisieParis } from "@/lib/dates";

export type ConducteurAntai = {
  civilite: "M" | "MME" | "";
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  pays_naissance: string;
  adresse_ligne1: string;
  adresse_ligne2: string;
  code_postal: string;
  ville: string;
  pays: string;
  numero_permis: string;
  date_delivrance_permis: string;
  pays_delivrance_permis: string;
  email: string;
};

export type AmendeAntai = {
  id: string;
  numero_avis: string;
  type_avis: "contravention" | "amende_forfaitaire_delictuelle" | "amende_majoree" | "autre" | "";
  date_avis: string;
  date_infraction: string; // « AAAA-MM-JJTHH:MM » (heure de Paris), « AAAA-MM-JJ » si l'heure est inconnue
  immatriculation: string;
  nature: string;
  montant: number | ""; // en euros
  date_limite_designation: string;
  contrat: { id: string; reference: string };
  conducteur: ConducteurAntai;
};

export type SocieteAntai = { raison_sociale: string; adresse_ligne1: string; adresse_ligne2: string; code_postal: string; ville: string; email: string };

type ClientSource = {
  civilite: string | null;
  nom: string;
  prenom: string | null;
  dateNaissance: Date | null;
  lieuNaissance: string | null;
  paysNaissance: string | null;
  adresse: string | null;
  adresseComplement: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string | null;
  numeroPermis: string | null;
  dateDelivrancePermis: Date | null;
  dateObtentionPermis: Date | null;
  paysDelivrancePermis: string | null;
  email: string | null;
};

export type AmendeSource = {
  id: string;
  numeroAvis: string | null;
  typeAvis: string | null;
  dateAvis: Date | null;
  infractionLe: Date | null;
  heureInconnue: boolean;
  immatriculationLue: string | null;
  vehicule: { immatriculation: string | null } | null;
  nature: string | null;
  montantCentimes: number | null;
  dateLimite: Date | null;
  contrat: { id: string; numero: string } | null;
  client: ClientSource | null;
};

const t = (v: string | null | undefined) => (v ?? "").trim();
/** Date calendaire (@db.Date, minuit UTC) → « AAAA-MM-JJ ». */
const jour = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export function conducteurAntai(c: ClientSource | null): ConducteurAntai {
  return {
    civilite: c?.civilite === "M" || c?.civilite === "MME" ? c.civilite : "",
    nom: t(c?.nom).toUpperCase(),
    prenom: t(c?.prenom),
    date_naissance: jour(c?.dateNaissance),
    lieu_naissance: t(c?.lieuNaissance),
    pays_naissance: t(c?.paysNaissance),
    adresse_ligne1: t(c?.adresse),
    adresse_ligne2: t(c?.adresseComplement),
    code_postal: t(c?.codePostal),
    ville: t(c?.ville),
    pays: t(c?.pays),
    numero_permis: t(c?.numeroPermis),
    date_delivrance_permis: c ? jour(dateDelivranceEffective(c)) : "",
    pays_delivrance_permis: t(c?.paysDelivrancePermis),
    email: t(c?.email),
  };
}

export function versAmendeAntai(a: AmendeSource): AmendeAntai {
  const saisie = dateVersSaisieParis(a.infractionLe); // « AAAA-MM-JJTHH:MM » à Paris
  return {
    id: a.id,
    numero_avis: t(a.numeroAvis),
    type_avis: (a.typeAvis ? a.typeAvis.toLowerCase() : "") as AmendeAntai["type_avis"],
    date_avis: jour(a.dateAvis),
    date_infraction: a.infractionLe ? (a.heureInconnue ? saisie.slice(0, 10) : saisie) : "",
    immatriculation: t(a.immatriculationLue ?? a.vehicule?.immatriculation),
    nature: t(a.nature),
    montant: a.montantCentimes == null ? "" : a.montantCentimes / 100,
    date_limite_designation: jour(a.dateLimite),
    contrat: { id: a.contrat?.id ?? "", reference: a.contrat?.numero ?? "" },
    conducteur: conducteurAntai(a.client),
  };
}

/** Société destinataire des avis : réglages Amendes, à défaut Réglages › Société. */
export function societeAntai(r: {
  societeNom: string;
  societeAdresse: string | null;
  societeCodePostal: string | null;
  societeVille: string | null;
  societeEmail: string | null;
  amendesRaisonSociale: string | null;
  amendesAdresse: string | null;
  amendesAdresseComplement: string | null;
  amendesCodePostal: string | null;
  amendesVille: string | null;
  amendesEmail: string | null;
}): SocieteAntai {
  return {
    raison_sociale: t(r.amendesRaisonSociale) || t(r.societeNom),
    adresse_ligne1: t(r.amendesAdresse) || t(r.societeAdresse),
    adresse_ligne2: t(r.amendesAdresseComplement),
    code_postal: t(r.amendesCodePostal) || t(r.societeCodePostal),
    ville: t(r.amendesVille) || t(r.societeVille),
    email: t(r.amendesEmail) || t(r.societeEmail),
  };
}

/** En-têtes et lignes de l'export CSV « pour désignation » : mêmes noms de colonnes que l'API. */
export const COLONNES_CSV_ANTAI = [
  "id", "numero_avis", "type_avis", "date_avis", "date_infraction", "immatriculation", "nature", "montant", "date_limite_designation",
  "contrat_id", "contrat_reference",
  "conducteur_civilite", "conducteur_nom", "conducteur_prenom", "conducteur_date_naissance", "conducteur_lieu_naissance", "conducteur_pays_naissance",
  "conducteur_adresse_ligne1", "conducteur_adresse_ligne2", "conducteur_code_postal", "conducteur_ville", "conducteur_pays",
  "conducteur_numero_permis", "conducteur_date_delivrance_permis", "conducteur_pays_delivrance_permis", "conducteur_email",
  "societe_raison_sociale", "societe_adresse_ligne1", "societe_adresse_ligne2", "societe_code_postal", "societe_ville", "societe_email",
] as const;

export function ligneCsvAntai(a: AmendeAntai, s: SocieteAntai): string[] {
  const c = a.conducteur;
  const montant = a.montant === "" ? "" : a.montant.toFixed(2).replace(".", ",");
  return [
    a.id, a.numero_avis, a.type_avis, a.date_avis, a.date_infraction, a.immatriculation, a.nature, montant, a.date_limite_designation,
    a.contrat.id, a.contrat.reference,
    c.civilite, c.nom, c.prenom, c.date_naissance, c.lieu_naissance, c.pays_naissance,
    c.adresse_ligne1, c.adresse_ligne2, c.code_postal, c.ville, c.pays,
    c.numero_permis, c.date_delivrance_permis, c.pays_delivrance_permis, c.email,
    s.raison_sociale, s.adresse_ligne1, s.adresse_ligne2, s.code_postal, s.ville, s.email,
  ];
}
