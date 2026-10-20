// Bouton « Générer une description » : texte factuel construit uniquement à partir
// des caractéristiques saisies (aucune promesse, aucun superlatif). Modifiable ensuite.
import { LIBELLES_BOITE, LIBELLES_CARBURANT } from "@/lib/vehicule";
import { kmSite } from "./format";
import { CATEGORIES_EQUIPEMENTS, ORDRE_CATEGORIES, type Equipements } from "./equipements";

export type EntreeDescription = {
  marque: string;
  modele: string;
  version: string | null;
  annee: number | null;
  dateMiseEnCirculation: Date | null;
  kilometrage: number | null;
  carburant: keyof typeof LIBELLES_CARBURANT | null;
  boite: keyof typeof LIBELLES_BOITE | null;
  puissanceCh: number | null;
  couleur: string | null;
  nombrePlaces: number | null;
  equipements: Equipements;
  ctAJour: boolean;
  ctDate: Date | null;
  carnetEntretien: boolean;
  rapportHistovec: boolean;
  premiereMain: boolean;
  nombreProprietaires: number | null;
  garantieMois: number | null;
  nonFumeur: boolean;
  reviseAvantVente: boolean;
  travauxRealises: string | null;
};

const mois = (d: Date) => d.toISOString().slice(0, 7).split("-").reverse().join("/");
const jour = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

export function genererDescription(e: EntreeDescription): string {
  const nom = [e.marque, e.modele, e.version].filter(Boolean).join(" ");
  const caracteristiques = [
    e.annee ? `de ${e.annee}` : null,
    e.kilometrage !== null ? kmSite(e.kilometrage) : null,
    e.carburant ? LIBELLES_CARBURANT[e.carburant].toLowerCase() : null,
    e.boite ? `boîte ${LIBELLES_BOITE[e.boite].toLowerCase()}` : null,
    e.puissanceCh ? `${e.puissanceCh} ch` : null,
  ].filter(Boolean);
  const lignes: string[] = [`${nom}${caracteristiques.length ? `, ${caracteristiques.join(", ")}` : ""}.`];

  const details = [
    e.dateMiseEnCirculation ? `Première mise en circulation : ${mois(e.dateMiseEnCirculation)}.` : null,
    e.couleur ? `Couleur : ${e.couleur.toLowerCase()}.` : null,
    e.nombrePlaces ? `${e.nombrePlaces} places.` : null,
  ].filter(Boolean);
  if (details.length) lignes.push(details.join(" "));

  const historique = [
    e.premiereMain ? "Première main" : e.nombreProprietaires ? `${e.nombreProprietaires} propriétaire${e.nombreProprietaires > 1 ? "s" : ""}` : null,
    e.ctAJour ? `Contrôle technique à jour${e.ctDate ? ` (le ${jour(e.ctDate)})` : ""}` : null,
    e.carnetEntretien ? "Carnet d'entretien et factures disponibles" : null,
    e.rapportHistovec ? "Rapport Histovec disponible" : null,
    e.reviseAvantVente ? `Révisé avant la vente${e.travauxRealises ? ` : ${e.travauxRealises.trim().replace(/\.$/, "")}` : ""}` : null,
    e.garantieMois ? `Garantie ${e.garantieMois} mois` : null,
    e.nonFumeur ? "Véhicule non-fumeur" : null,
  ].filter(Boolean);
  if (historique.length) lignes.push("", "**Historique et entretien**", ...historique.map((h) => `- ${h}`));

  const equipements = [...ORDRE_CATEGORIES.flatMap((c) => e.equipements[c]), ...e.equipements.autres];
  if (equipements.length) {
    const principaux = equipements.slice(0, 10);
    lignes.push("", "**Équipements principaux**", ...principaux.map((x) => `- ${x}`));
    if (equipements.length > principaux.length) lignes.push(`- … et ${equipements.length - principaux.length} autres équipements (liste complète ci-dessous)`);
  }

  lignes.push("", "Véhicule visible sur rendez-vous. Pour toute question, contactez-nous.");
  return lignes.join("\n");
}

/** Libellé d'une catégorie (pour l'affichage groupé). */
export const libelleCategorie = (c: keyof typeof CATEGORIES_EQUIPEMENTS) => CATEGORIES_EQUIPEMENTS[c].libelle;
