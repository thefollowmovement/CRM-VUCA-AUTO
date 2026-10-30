// Conversion client ↔ valeurs de formulaire (appelé par les pages serveur).
import { dateCalendaireVersISO } from "@/lib/format";
import type { SaisieClient } from "@/lib/validations/location";

export const valeursNouveauClient = (): SaisieClient => ({
  civilite: "", nom: "", prenom: "", dateNaissance: "", lieuNaissance: "", paysNaissance: "", adresse: "", adresseComplement: "", codePostal: "", ville: "", pays: "France",
  telephone: "", email: "", numeroPermis: "", dateObtentionPermis: "", dateDelivrancePermis: "", paysDelivrancePermis: "France", categoriePermis: "B", dateValiditePermis: "",
  typePieceIdentite: "", numeroPieceIdentite: "", dateValiditePieceIdentite: "", entreprise: "", siretEntreprise: "",
  listeNoire: false, motifListeNoire: "", notes: "",
});

type ClientEnBase = {
  [K in keyof SaisieClient]: K extends "listeNoire" ? boolean : K extends `date${string}` ? Date | null : string | null;
};

export function clientVersSaisie(c: ClientEnBase): SaisieClient {
  const t = (v: string | null) => v ?? "";
  const d = (v: Date | null) => dateCalendaireVersISO(v);
  return {
    civilite: (c.civilite ?? "") as SaisieClient["civilite"], nom: t(c.nom), prenom: t(c.prenom), dateNaissance: d(c.dateNaissance),
    lieuNaissance: t(c.lieuNaissance), paysNaissance: t(c.paysNaissance), adresse: t(c.adresse), adresseComplement: t(c.adresseComplement), codePostal: t(c.codePostal), ville: t(c.ville), pays: t(c.pays),
    telephone: t(c.telephone), email: t(c.email), numeroPermis: t(c.numeroPermis), dateObtentionPermis: d(c.dateObtentionPermis),
    // Délivrance vide : pré-remplie avec la date d'obtention (à corriger si le titre a été refait).
    dateDelivrancePermis: d(c.dateDelivrancePermis ?? c.dateObtentionPermis), paysDelivrancePermis: t(c.paysDelivrancePermis),
    categoriePermis: t(c.categoriePermis), dateValiditePermis: d(c.dateValiditePermis),
    typePieceIdentite: (c.typePieceIdentite ?? "") as SaisieClient["typePieceIdentite"], numeroPieceIdentite: t(c.numeroPieceIdentite),
    dateValiditePieceIdentite: d(c.dateValiditePieceIdentite), entreprise: t(c.entreprise), siretEntreprise: t(c.siretEntreprise),
    listeNoire: c.listeNoire, motifListeNoire: t(c.motifListeNoire), notes: t(c.notes),
  };
}
