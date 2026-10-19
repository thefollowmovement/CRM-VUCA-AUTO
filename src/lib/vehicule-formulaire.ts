// Conversion d'un véhicule enregistré en valeurs de formulaire (texte saisi).
import type { obtenirVehicule } from "@/server/requetes/vehicules";
import { centimesVersSaisie, dateCalendaireVersISO } from "@/lib/format";
import type { SaisieVehicule } from "@/lib/validations/vehicule";

type Vehicule = NonNullable<Awaited<ReturnType<typeof obtenirVehicule>>>;

const t = (v: string | null | undefined) => v ?? "";
const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const e = (v: number | null | undefined) => centimesVersSaisie(v ?? null);
const d = (v: Date | null | undefined) => dateCalendaireVersISO(v ?? null);

export function vehiculeVersSaisie(v: Vehicule): SaisieVehicule {
  return {
    marque: v.marque, modele: v.modele, version: t(v.version), immatriculation: t(v.immatriculation), vin: t(v.vin),
    annee: n(v.annee), dateMiseEnCirculation: d(v.dateMiseEnCirculation), carburant: v.carburant ?? "", boite: v.boite ?? "",
    couleur: t(v.couleur), nombrePlaces: n(v.nombrePlaces), puissanceFiscale: n(v.puissanceFiscale), critAir: v.critAir ?? "",
    typeExploitation: v.typeExploitation,
    dateAchat: d(v.dateAchat), prixAchat: e(v.prixAchatCentimes), kilometrageAchat: n(v.kilometrageAchat),
    provenance: v.provenance ?? "", nomVendeur: t(v.nomVendeur), lienAnnonce: t(v.lienAnnonce), notesAchat: t(v.notesAchat),
    prixCible: e(v.prixCibleCentimes),
    tarifJournalier: e(v.tarifJournalierCentimes), tarifHebdo: e(v.tarifHebdoCentimes), tarifMensuel: e(v.tarifMensuelCentimes),
    kmInclusParJour: n(v.kmInclusParJour), kmInclusParMois: n(v.kmInclusParMois), prixKmSup: e(v.prixKmSupCentimes),
    cautionDefaut: e(v.cautionDefautCentimes), franchiseDefaut: e(v.franchiseDefautCentimes), dateMiseEnLocation: d(v.dateMiseEnLocation),
    kilometrageActuel: n(v.kilometrageActuel), dateProchainControleTechnique: d(v.dateProchainControleTechnique),
    assureur: t(v.assureur), numeroPoliceAssurance: t(v.numeroPoliceAssurance), dateEcheanceAssurance: d(v.dateEcheanceAssurance),
    dateProchaineVidange: d(v.dateProchaineVidange), kmProchaineVidange: n(v.kmProchaineVidange),
    dateProchaineRevision: d(v.dateProchaineRevision), kmProchaineRevision: n(v.kmProchaineRevision),
    notes: t(v.notes),
    financement: v.participations.map((p) => ({ partenaireId: p.partenaireId, montant: e(p.montantCentimes), note: t(p.note) })),
    forcerEcart: v.ecartFinancementAccepte,
    motifEcart: t(v.ecartFinancementMotif),
  };
}

/** Valeurs vides d'un nouveau véhicule. */
export function valeursNouveauVehicule(aujourdhuiISO: string): SaisieVehicule {
  return {
    marque: "", modele: "", version: "", immatriculation: "", vin: "", annee: "", dateMiseEnCirculation: "",
    carburant: "", boite: "", couleur: "", nombrePlaces: "", puissanceFiscale: "", critAir: "",
    typeExploitation: "ACHAT_REVENTE", statutInitial: "EN_PREPARATION",
    dateAchat: aujourdhuiISO, prixAchat: "", kilometrageAchat: "", provenance: "", nomVendeur: "", lienAnnonce: "", notesAchat: "",
    prixCible: "", tarifJournalier: "", tarifHebdo: "", tarifMensuel: "", kmInclusParJour: "", kmInclusParMois: "",
    prixKmSup: "", cautionDefaut: "", franchiseDefaut: "", dateMiseEnLocation: "",
    kilometrageActuel: "", dateProchainControleTechnique: "", assureur: "", numeroPoliceAssurance: "", dateEcheanceAssurance: "",
    dateProchaineVidange: "", kmProchaineVidange: "", dateProchaineRevision: "", kmProchaineRevision: "",
    notes: "", financement: [], forcerEcart: false, motifEcart: "",
  };
}
