// Conversion contrat ↔ valeurs de l'assistant (appelé par les pages serveur).
import { centimesVersSaisie } from "@/lib/format";
import { ajouterJoursParis, dateVersSaisieParis, debutJourParis, jourISOVersDateParis } from "@/lib/dates";
import type { SaisieContrat } from "@/lib/validations/location";
import type { VehiculeLouable } from "@/server/requetes/contrats";

const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** Nouveau contrat : départ demain 9 h (ou le jour choisi sur le planning), journalier, tarifs du véhicule. */
export function valeursNouveauContrat(p: { clientId?: string; vehicule?: VehiculeLouable | null; jour?: string; jourEcheance: number }): SaisieContrat {
  const jour = (p.jour && jourISOVersDateParis(p.jour)) || ajouterJoursParis(debutJourParis(new Date()), 1);
  const depart = new Date(jour.getTime() + 9 * 3600 * 1000);
  const v = p.vehicule;
  return {
    clientId: p.clientId ?? "",
    conducteursIds: [],
    vehiculeId: v?.id ?? "",
    type: "JOURNALIERE",
    statut: "RESERVATION",
    departPrevuLe: dateVersSaisieParis(depart),
    retourPrevuLe: dateVersSaisieParis(ajouterJoursParis(depart, 1)),
    lieuDepart: "",
    lieuRetour: "",
    livraison: false,
    fraisLivraison: "",
    tarif: centimesVersSaisie(v?.tarifJournalierCentimes),
    tarifJournalier: centimesVersSaisie(v?.tarifJournalierCentimes),
    remise: "",
    kilometrageIllimite: false,
    kmInclusParUnite: n(v?.kmInclusParJour),
    prixKmSup: centimesVersSaisie(v?.prixKmSupCentimes),
    caution: centimesVersSaisie(v?.cautionDefautCentimes),
    modeCaution: "",
    franchise: centimesVersSaisie(v?.franchiseDefautCentimes),
    acompte: "",
    jourEcheanceMensuelle: String(p.jourEcheance),
    options: [],
    notes: "",
  };
}

type ContratEnBase = {
  clientId: string; vehiculeId: string; type: SaisieContrat["type"]; statut: string; departPrevuLe: Date; retourPrevuLe: Date;
  lieuDepart: string | null; lieuRetour: string | null; livraison: boolean; fraisLivraisonCentimes: number; tarifCentimes: number;
  tarifJournalierCentimes: number | null; remiseCentimes: number; kilometrageIllimite: boolean; kmInclusParUnite: number | null;
  prixKmSupCentimes: number | null; cautionCentimes: number; modeCaution: string | null; franchiseCentimes: number | null;
  acompteCentimes: number | null; jourEcheanceMensuelle: number | null; notes: string | null;
  options: { optionId: string | null; quantite: number }[];
  conducteursAdditionnels: { clientId: string }[];
};

export function contratVersSaisie(c: ContratEnBase): SaisieContrat {
  const e = (v: number | null) => (v ? centimesVersSaisie(v) : "");
  return {
    clientId: c.clientId,
    conducteursIds: c.conducteursAdditionnels.map((x) => x.clientId),
    vehiculeId: c.vehiculeId,
    type: c.type,
    statut: c.statut === "CONFIRMEE" ? "CONFIRMEE" : "RESERVATION",
    departPrevuLe: dateVersSaisieParis(c.departPrevuLe),
    retourPrevuLe: dateVersSaisieParis(c.retourPrevuLe),
    lieuDepart: c.lieuDepart ?? "",
    lieuRetour: c.lieuRetour ?? "",
    livraison: c.livraison,
    fraisLivraison: e(c.fraisLivraisonCentimes),
    tarif: centimesVersSaisie(c.tarifCentimes),
    tarifJournalier: centimesVersSaisie(c.tarifJournalierCentimes),
    remise: e(c.remiseCentimes),
    kilometrageIllimite: c.kilometrageIllimite,
    kmInclusParUnite: n(c.kmInclusParUnite),
    prixKmSup: centimesVersSaisie(c.prixKmSupCentimes),
    caution: e(c.cautionCentimes),
    modeCaution: (c.modeCaution ?? "") as SaisieContrat["modeCaution"],
    franchise: centimesVersSaisie(c.franchiseCentimes),
    acompte: e(c.acompteCentimes),
    jourEcheanceMensuelle: n(c.jourEcheanceMensuelle),
    // Les options retirées du catalogue ne sont plus proposées
    options: c.options.filter((o) => o.optionId).map((o) => ({ optionId: o.optionId!, quantite: o.quantite })),
    notes: c.notes ?? "",
  };
}
