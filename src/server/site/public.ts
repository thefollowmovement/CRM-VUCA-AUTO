// =====================================================================
//  Lectures du site public : SEULE source de données des pages de app/(site).
//  Chaque fonction sélectionne une liste blanche de champs et renvoie des
//  objets construits ici (jamais un modèle Prisma complet).
// =====================================================================
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { lireConfigDomaines } from "@/lib/domaines";
import { modeleConfidentialite, modeleMentionsLegales, type EntreeLegal } from "@/lib/site/legal";
import { accentValide, texteSurCouleur } from "@/lib/site/couleurs";
import { lireEngagements, lireFaq, lireHoraires, lireListe, lireReseaux } from "@/lib/site/reglages-defaut";
import type { ReglagesPublics } from "@/lib/site/reglages-publics";
import { toPublicVehicle, type VehiculePublic } from "@/lib/site/vehicule-public";
import { normaliserNumero } from "@/lib/site/whatsapp";
import { LIBELLES_SOURCE_AVIS } from "@/lib/validations/site";
import type { AvisPublic } from "@/lib/site/reglages-publics";
import { STATUTS_PUBLIABLES } from "./annonces";
import { OU_ANNONCE_VISIBLE } from "./visibilite";

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
      fichiers: { where: { categorie: "PHOTO_VEHICULE", publique: true }, select: { id: true, recadrage: true }, orderBy: [{ ordrePublic: "asc" }, { creeLe: "asc" }] },
    },
  },
} satisfies Prisma.AnnonceSelect;

type LigneAnnonce = Prisma.AnnonceGetPayload<{ select: typeof SELECTION_PUBLIQUE }>;

async function versPublic(lignes: LigneAnnonce[]): Promise<VehiculePublic[]> {
  const options = await db.reglagesSite.findUnique({ where: { id: 1 }, select: { immatriculationVisible: true } });
  return lignes.map(({ vehicule: { fichiers, ...vehicule }, ...annonce }) =>
    toPublicVehicle({ annonce, vehicule, photos: fichiers }, { immatriculationVisible: options?.immatriculationVisible ?? false }),
  );
}

const EN_LIGNE: Prisma.AnnonceWhereInput = { publiee: true, vehicule: { statut: { in: [...STATUTS_PUBLIABLES] }, archiveLe: null } };

/** Annonces en ligne (véhicules En vente / Réservé), les plus récentes d'abord. */
export async function annoncesPubliees(limite?: number): Promise<VehiculePublic[]> {
  return versPublic(await db.annonce.findMany({ where: EN_LIGNE, select: SELECTION_PUBLIQUE, orderBy: { publieeLe: "desc" }, take: limite }));
}

/** Page d'une annonce (en ligne, ou vendue avec le bandeau « vendu ») ; null = 404. */
export async function annonceParSlug(slug: string): Promise<VehiculePublic | null> {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  const ligne = await db.annonce.findFirst({ where: { slug, ...OU_ANNONCE_VISIBLE }, select: SELECTION_PUBLIQUE });
  return ligne ? ((await versPublic([ligne]))[0] ?? null) : null;
}

/** Véhicules vendus depuis moins de `jours` jours dont l'annonce avait été publiée (badge « Vendu », sans prix). */
export async function annoncesVenduesRecemment(jours: number, limite = 6): Promise<VehiculePublic[]> {
  const depuis = new Date(Date.now() - jours * 86_400_000);
  return versPublic(
    await db.annonce.findMany({
      where: { publieeLe: { not: null }, vehicule: { statut: "VENDU", archiveLe: null, dateVente: { gte: depuis } } },
      select: SELECTION_PUBLIQUE,
      orderBy: { vehicule: { dateVente: "desc" } },
      take: limite,
    }),
  );
}

/** Nombre total de véhicules vendus (chiffre réel affiché si le réglage l'autorise et le seuil est atteint). */
export async function nombreVehiculesVendus(): Promise<number> {
  return db.vehicule.count({ where: { statut: "VENDU" } });
}

/** Réglages de la section « vendus » et du compteur de ventes. */
export async function reglagesVendus() {
  const r = await db.reglagesSite.findUnique({ where: { id: 1 }, select: { afficherVendus: true, joursVendus: true, afficherNombreVendus: true, seuilNombreVendus: true } });
  return { afficherVendus: r?.afficherVendus ?? false, joursVendus: r?.joursVendus ?? 60, afficherNombreVendus: r?.afficherNombreVendus ?? false, seuilNombreVendus: r?.seuilNombreVendus ?? 20 };
}

/** Textes légaux : ceux saisis dans le CRM, sinon le modèle généré à partir des réglages. */
export async function textesLegaux(): Promise<{ mentionsLegales: string; confidentialite: string }> {
  const r = await db.reglagesSite.findUnique({
    where: { id: 1 },
    select: { mentionsLegales: true, confidentialite: true, nomAffiche: true, formeJuridique: true, siret: true, adresseSiege: true, email: true, telephone: true, plausibleDomaine: true, googleAnalyticsId: true },
  });
  const entree: EntreeLegal = {
    nomAffiche: vide(r?.nomAffiche) ?? "VUCA AUTO",
    formeJuridique: vide(r?.formeJuridique),
    siret: vide(r?.siret),
    adresseSiege: vide(r?.adresseSiege),
    email: vide(r?.email),
    telephone: vide(r?.telephone),
    domaine: lireConfigDomaines(process.env).site,
    plausible: !!r?.plausibleDomaine,
    googleAnalytics: !!r?.googleAnalyticsId,
  };
  return {
    mentionsLegales: vide(r?.mentionsLegales) ?? modeleMentionsLegales(entree),
    confidentialite: vide(r?.confidentialite) ?? modeleConfidentialite(entree),
  };
}

/** Texte et photo de la page « À propos ». */
export async function texteAPropos(): Promise<{ texte: string | null; photoId: string | null }> {
  const r = await db.reglagesSite.findUnique({ where: { id: 1 }, select: { aProposTexte: true, aProposPhotoId: true } });
  return { texte: vide(r?.aProposTexte), photoId: r?.aProposPhotoId ?? null };
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
  return db.annonce.count({ where: EN_LIGNE });
}

/** Pour le plan du site : site en ligne ? + adresses des annonces visibles et date de mise à jour. */
export async function planDuSite(): Promise<{ enLigne: boolean; annonces: { slug: string; misAJourLe: Date }[] }> {
  const r = await db.reglagesSite.findUnique({ where: { id: 1 }, select: { enLigne: true } });
  if (!r?.enLigne) return { enLigne: false, annonces: [] };
  const annonces = await db.annonce.findMany({ where: OU_ANNONCE_VISIBLE, select: { slug: true, misAJourLe: true }, orderBy: { publieeLe: "desc" } });
  return { enLigne: true, annonces };
}
