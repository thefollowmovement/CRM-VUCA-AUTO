// =====================================================================
//  LA porte de sortie des véhicules vers le site public.
//
//  toPublicVehicle() construit l'objet public CHAMP PAR CHAMP à partir d'une
//  liste blanche. Tout ce qui n'est pas recopié ici n'existe pas pour le site :
//  prix d'achat, dépenses, coût de revient, marge, participations, investisseurs,
//  partenaires, vendeur d'origine, provenance, notes, valeur estimée, documents,
//  historique, clients et VIN ne peuvent pas sortir, même s'ils sont fournis.
//  (Test : vehicule-public.test.ts.)
// =====================================================================
import { LIBELLES_BOITE, LIBELLES_CARBURANT, LIBELLES_CRITAIR } from "@/lib/vehicule";
import { normaliserEquipements, type Equipements } from "./equipements";
import { versionRecadrage } from "./photos";

/** Ce que les lectures publiques fournissent (sélection Prisma restreinte, voir server/site). */
export type EntreeVehiculePublic = {
  annonce: {
    reference: string;
    slug: string;
    titre: string;
    prixAfficheCentimes: number | null;
    prixNegociable: boolean;
    puissanceCh: number | null;
    description: string | null;
    equipements: unknown;
    ctAJour: boolean;
    ctDate: Date | null;
    carnetEntretien: boolean;
    rapportHistovec: boolean;
    nombreProprietaires: number | null;
    premiereMain: boolean;
    garantieMois: number | null;
    garantieTexte: string | null;
    nonFumeur: boolean;
    reviseAvantVente: boolean;
    travauxRealises: string | null;
    kilometrageVerifie: boolean;
    sourceKilometrage: string | null;
    couvertureId: string | null;
    misAJourLe: Date;
  };
  vehicule: {
    marque: string;
    modele: string;
    version: string | null;
    annee: number | null;
    dateMiseEnCirculation: Date | null;
    carburant: keyof typeof LIBELLES_CARBURANT | null;
    boite: keyof typeof LIBELLES_BOITE | null;
    couleur: string | null;
    nombrePlaces: number | null;
    critAir: keyof typeof LIBELLES_CRITAIR | null;
    kilometrageActuel: number | null;
    immatriculation: string | null;
    statut: string;
    dateVente: Date | null;
  };
  /** Photos cochées « publiques », dans l'ordre choisi (le recadrage ne sert qu'à la version d'URL). */
  photos: { id: string; recadrage?: unknown }[];
};

export type PointConfiance = { cle: string; libelle: string; detail: string | null };

export type VehiculePublic = {
  reference: string;
  slug: string;
  titre: string;
  marque: string;
  modele: string;
  version: string | null;
  annee: number | null;
  /** « 2021-03 » (mois de première mise en circulation) */
  miseEnCirculation: string | null;
  kilometrage: number | null;
  carburant: string | null;
  boite: string | null;
  puissanceCh: number | null;
  critAir: string | null;
  places: number | null;
  couleur: string | null;
  prixCentimes: number | null;
  prixNegociable: boolean;
  disponibilite: "DISPONIBLE" | "RESERVE" | "VENDU";
  description: string | null;
  equipements: Equipements;
  confiance: PointConfiance[];
  travauxRealises: string | null;
  /** Photos publiques : la couverture d'abord. */
  photos: { id: string; alt: string; v: string }[];
  /** Seulement si le réglage « immatriculation visible » est activé. */
  immatriculation: string | null;
  misAJourLe: string;
  vendueLe: string | null;
};

/** Clés autorisées de l'objet public (contrôlées par le test). */
export const CHAMPS_PUBLICS = [
  "reference", "slug", "titre", "marque", "modele", "version", "annee", "miseEnCirculation", "kilometrage", "carburant", "boite",
  "puissanceCh", "critAir", "places", "couleur", "prixCentimes", "prixNegociable", "disponibilite", "description", "equipements",
  "confiance", "travauxRealises", "photos", "immatriculation", "misAJourLe", "vendueLe",
] as const satisfies readonly (keyof VehiculePublic)[];

const moisAnnee = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : null);
const jourMoisAnnee = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

/** Points de confiance cochés dans le CRM, dans l'ordre d'affichage (badges). */
export function pointsConfiance(a: EntreeVehiculePublic["annonce"]): PointConfiance[] {
  const p: PointConfiance[] = [];
  if (a.ctAJour) p.push({ cle: "ct", libelle: "Contrôle technique à jour", detail: a.ctDate ? `Le ${jourMoisAnnee(a.ctDate)}` : null });
  if (a.premiereMain) p.push({ cle: "premiereMain", libelle: "Première main", detail: null });
  else if (a.nombreProprietaires) p.push({ cle: "proprietaires", libelle: `${a.nombreProprietaires} propriétaire${a.nombreProprietaires > 1 ? "s" : ""}`, detail: null });
  if (a.garantieMois) p.push({ cle: "garantie", libelle: `Garantie ${a.garantieMois} mois`, detail: a.garantieTexte });
  if (a.carnetEntretien) p.push({ cle: "carnet", libelle: "Carnet d'entretien / factures disponibles", detail: null });
  if (a.rapportHistovec) p.push({ cle: "histovec", libelle: "Rapport Histovec disponible", detail: null });
  if (a.reviseAvantVente) p.push({ cle: "revise", libelle: "Révisé avant la vente", detail: a.travauxRealises });
  if (a.kilometrageVerifie) p.push({ cle: "km", libelle: "Kilométrage vérifié", detail: a.sourceKilometrage });
  if (a.nonFumeur) p.push({ cle: "nonFumeur", libelle: "Véhicule non-fumeur", detail: null });
  return p;
}

export function toPublicVehicle(e: EntreeVehiculePublic, options: { immatriculationVisible: boolean }): VehiculePublic {
  const { annonce: a, vehicule: v } = e;
  const titre = a.titre.trim() || [v.marque, v.modele].join(" ");
  const couverture = e.photos.find((p) => p.id === a.couvertureId);
  const ordre = couverture ? [couverture, ...e.photos.filter((p) => p !== couverture)] : e.photos;
  const vendu = v.statut === "VENDU";
  return {
    reference: a.reference,
    slug: a.slug,
    titre,
    marque: v.marque,
    modele: v.modele,
    version: v.version,
    annee: v.annee,
    miseEnCirculation: moisAnnee(v.dateMiseEnCirculation),
    kilometrage: v.kilometrageActuel,
    carburant: v.carburant ? LIBELLES_CARBURANT[v.carburant] : null,
    boite: v.boite ? LIBELLES_BOITE[v.boite] : null,
    puissanceCh: a.puissanceCh,
    critAir: v.critAir ? LIBELLES_CRITAIR[v.critAir] : null,
    places: v.nombrePlaces,
    couleur: v.couleur,
    prixCentimes: vendu ? null : a.prixAfficheCentimes,
    prixNegociable: !vendu && a.prixNegociable,
    disponibilite: vendu ? "VENDU" : v.statut === "RESERVE" ? "RESERVE" : "DISPONIBLE",
    description: a.description,
    equipements: normaliserEquipements(a.equipements),
    confiance: pointsConfiance(a),
    travauxRealises: a.reviseAvantVente ? a.travauxRealises : null,
    photos: ordre.map((p, i) => ({ id: p.id, alt: `${titre}${v.annee ? ` ${v.annee}` : ""} — photo ${i + 1} sur ${ordre.length}`, v: versionRecadrage(p.recadrage) })),
    immatriculation: options.immatriculationVisible ? v.immatriculation : null,
    misAJourLe: a.misAJourLe.toISOString(),
    vendueLe: vendu && v.dateVente ? v.dateVente.toISOString().slice(0, 10) : null,
  };
}
