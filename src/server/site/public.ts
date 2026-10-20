// =====================================================================
//  Lectures du site public : SEULE source de données des pages de app/(site).
//  Chaque fonction sélectionne une liste blanche de champs et renvoie des
//  objets construits ici (jamais un modèle Prisma complet).
// =====================================================================
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { accentValide, texteSurCouleur } from "@/lib/site/couleurs";
import { lireEngagements, lireFaq, lireHoraires, lireListe, lireReseaux } from "@/lib/site/reglages-defaut";
import type { ReglagesPublics } from "@/lib/site/reglages-publics";
import { toPublicVehicle, type VehiculePublic } from "@/lib/site/vehicule-public";
import { normaliserNumero } from "@/lib/site/whatsapp";
import { LIBELLES_SOURCE_AVIS } from "@/lib/validations/site";
import type { AvisPublic } from "@/lib/site/reglages-publics";
import { STATUTS_PUBLIABLES } from "./annonces";

const vide = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** Coordonnées publiques de l'entreprise (page provisoire, pied de page). */
export async function coordonneesPubliques() {
  const [crm, site] = await Promise.all([
    db.reglages.findUnique({ where: { id: 1 }, select: { societeNom: true, societeTelephone: true, societeEmail: true, societeSiret: true } }),
    db.reglagesSite.findUnique({ where: { id: 1 }, select: { nomAffiche: true, telephone: true, email: true, siret: true } }),
  ]);
  return {
    nom: site?.nomAffiche || crm?.societeNom || "VUCA AUTO",
    telephone: site?.telephone?.trim() || crm?.societeTelephone?.trim() || null,
    email: site?.email?.trim() || crm?.societeEmail?.trim() || null,
    siret: site?.siret?.trim() || crm?.societeSiret?.trim() || null,
  };
}

/** Réglages publics du site (valeurs par défaut si la ligne n'existe pas encore). */
export async function reglagesPublics(): Promise<ReglagesPublics> {
  const r = await db.reglagesSite.findUnique({
    where: { id: 1 },
    select: {
      enLigne: true, nomAffiche: true, slogan: true, couleurAccent: true, logoClairId: true, logoFonceId: true, whatsapp: true,
      messageWhatsappGeneral: true, messageWhatsappVehicule: true, telephone: true, email: true, adresse: true, lienGoogleMaps: true,
      horaires: true, delaiReponse: true, vendeurNom: true, vendeurPhotoId: true, siret: true, formeJuridique: true, engagements: true,
      moyensPaiement: true, livraison: true, zoneLivraison: true, reprise: true, lienAvisGoogle: true, anneeCreation: true,
      accueilTitre: true, accueilSousTitre: true, bandeau: true, reseaux: true, faq: true,
    },
  });
  const accent = accentValide(r?.couleurAccent);
  const reseaux = lireReseaux(r?.reseaux);
  return {
    enLigne: r?.enLigne ?? false,
    nom: vide(r?.nomAffiche) ?? "VUCA AUTO",
    slogan: vide(r?.slogan),
    accent,
    surAccent: texteSurCouleur(accent),
    logoClairId: r?.logoClairId ?? null,
    logoFonceId: r?.logoFonceId ?? null,
    whatsapp: normaliserNumero(r?.whatsapp),
    messageWhatsappGeneral: r?.messageWhatsappGeneral ?? "Bonjour, je souhaiterais avoir des informations sur vos véhicules.",
    messageWhatsappVehicule: r?.messageWhatsappVehicule ?? "Bonjour, je suis intéressé par la {marque} {modele} {annee} à {prix} ({lien}). Est-elle toujours disponible ?",
    telephone: vide(r?.telephone),
    email: vide(r?.email),
    adresse: vide(r?.adresse),
    lienGoogleMaps: vide(r?.lienGoogleMaps),
    horaires: lireHoraires(r?.horaires),
    delaiReponse: vide(r?.delaiReponse),
    vendeurNom: vide(r?.vendeurNom),
    vendeurPhotoId: r?.vendeurPhotoId ?? null,
    siret: vide(r?.siret),
    formeJuridique: vide(r?.formeJuridique),
    engagements: lireEngagements(r?.engagements).filter((e) => e.actif),
    moyensPaiement: lireListe(r?.moyensPaiement, 10),
    livraison: r?.livraison ?? false,
    zoneLivraison: vide(r?.zoneLivraison),
    reprise: r?.reprise ?? false,
    lienAvisGoogle: vide(r?.lienAvisGoogle),
    anneeCreation: r?.anneeCreation ?? null,
    accueilTitre: vide(r?.accueilTitre),
    accueilSousTitre: vide(r?.accueilSousTitre),
    bandeau: vide(r?.bandeau),
    reseaux: Object.fromEntries(Object.entries(reseaux).filter(([, url]) => url)),
    faq: lireFaq(r?.faq),
  };
}

/** Champs lus pour construire un VehiculePublic (liste blanche, doublée par toPublicVehicle). */
const SELECTION_PUBLIQUE = {
  reference: true, slug: true, titre: true, prixAfficheCentimes: true, prixNegociable: true, puissanceCh: true, description: true,
  equipements: true, ctAJour: true, ctDate: true, carnetEntretien: true, rapportHistovec: true, nombreProprietaires: true,
  premiereMain: true, garantieMois: true, garantieTexte: true, nonFumeur: true, reviseAvantVente: true, travauxRealises: true,
  kilometrageVerifie: true, sourceKilometrage: true, couvertureId: true, misAJourLe: true,
  vehicule: {
    select: {
      marque: true, modele: true, version: true, annee: true, dateMiseEnCirculation: true, carburant: true, boite: true, couleur: true,
      nombrePlaces: true, critAir: true, kilometrageActuel: true, immatriculation: true, statut: true, dateVente: true,
      fichiers: { where: { categorie: "PHOTO_VEHICULE", publique: true }, select: { id: true }, orderBy: [{ ordrePublic: "asc" }, { creeLe: "asc" }] },
    },
  },
} satisfies Prisma.AnnonceSelect;

/** Annonces en ligne (véhicules En vente / Réservé), les plus récentes d'abord. */
export async function annoncesPubliees(limite?: number): Promise<VehiculePublic[]> {
  const [lignes, options] = await Promise.all([
    db.annonce.findMany({
      where: { publiee: true, vehicule: { statut: { in: [...STATUTS_PUBLIABLES] }, archiveLe: null } },
      select: SELECTION_PUBLIQUE,
      orderBy: { publieeLe: "desc" },
      take: limite,
    }),
    db.reglagesSite.findUnique({ where: { id: 1 }, select: { immatriculationVisible: true } }),
  ]);
  return lignes.map(({ vehicule: { fichiers, ...vehicule }, ...annonce }) =>
    toPublicVehicle({ annonce, vehicule, photos: fichiers }, { immatriculationVisible: options?.immatriculationVisible ?? false }),
  );
}

/** Avis clients affichés (actifs, authenticité certifiée), dans l'ordre choisi dans le CRM. */
export async function avisPublics(): Promise<AvisPublic[]> {
  const avis = await db.avisClient.findMany({
    where: { actif: true, certifieAuthentique: true },
    select: { auteur: true, note: true, texte: true, date: true, vehiculeAchete: true, source: true },
    orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
  });
  const mois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return avis.map((a) => ({ auteur: a.auteur, note: a.note, texte: a.texte, date: mois.format(a.date), vehiculeAchete: a.vehiculeAchete, source: LIBELLES_SOURCE_AVIS[a.source] }));
}

/** Nombre d'annonces en ligne (bouton « Voir toutes les voitures (N) »). */
export async function nombreAnnoncesPubliees(): Promise<number> {
  return db.annonce.count({ where: { publiee: true, vehicule: { statut: { in: [...STATUTS_PUBLIABLES] }, archiveLe: null } } });
}
