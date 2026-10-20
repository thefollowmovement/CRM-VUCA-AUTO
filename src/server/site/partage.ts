// Données des images de partage (WhatsApp, Facebook…) : rien d'autre que ce qui est déjà public.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prixSite, kmSite } from "@/lib/site/format";
import { contexteSite } from "./contexte";
import { photoPublique } from "./photos";
import { annonceParSlug, reglagesPublics } from "./public";

const enDataUri = (p: { contenu: Buffer; type: string } | null) => (p ? `data:${p.type};base64,${p.contenu.toString("base64")}` : null);

/** Polices Inter (WOFF : le générateur d'images ne lit pas le WOFF2). */
export async function policesPartage() {
  const dossier = path.join(process.cwd(), "src/server/site/polices");
  const [normal, gras] = await Promise.all([readFile(path.join(dossier, "inter-latin-400-normal.woff")), readFile(path.join(dossier, "inter-latin-700-normal.woff"))]);
  return [
    { name: "Inter", data: normal, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: gras, weight: 700 as const, style: "normal" as const },
  ];
}

export type DonneesPartage = {
  nom: string;
  accent: string;
  logo: string | null;
  titre: string;
  sousTitre: string | null;
  prix: string | null;
  photo: string | null;
  badge: string | null;
  /** Pastille « WhatsApp » : seulement si un numéro est réglé (et jamais pour une voiture vendue). */
  whatsapp: boolean;
  /** Demandée depuis l'aperçu du CRM : jamais mise en cache partagé. */
  prive: boolean;
};

async function identite() {
  const [r, { apercu }] = await Promise.all([reglagesPublics(), contexteSite()]);
  const logo = r.logoClairId ? enDataUri(await photoPublique(r.logoClairId, 400, "image/png")) : null;
  // L'aperçu du CRM (connexion exigée) voit le vrai site, même en maintenance
  return { r, logo, enLigne: r.enLigne || apercu, prive: apercu };
}

/** Image de partage générale (accueil et pages fixes). En maintenance : seulement le nom. */
export async function partageSite(): Promise<DonneesPartage> {
  const { r, logo, enLigne, prive } = await identite();
  // Même titre que l'accueil ; le sous-titre ne répète jamais le titre
  const titre = enLigne ? (r.accueilTitre ?? r.slogan ?? "Des voitures d'occasion choisies avec soin.") : "Notre site arrive bientôt.";
  const sousTitre = [r.slogan, "Voitures d'occasion · contact direct sur WhatsApp"].find((t) => t && t !== titre) ?? null;
  return { nom: r.nom, accent: r.accent, logo, titre, sousTitre, prix: null, photo: null, badge: null, whatsapp: !!r.whatsapp, prive };
}

/** Image de partage d'une annonce : photo de couverture, titre, kilométrage, prix. Rien du véhicule en maintenance. */
export async function partageVoiture(slug: string): Promise<DonneesPartage | null> {
  const { r, logo, enLigne, prive } = await identite();
  if (!enLigne) return partageSite();
  const v = await annonceParSlug(slug);
  if (!v) return null;
  const couverture = v.photos[0] ? enDataUri(await photoPublique(v.photos[0].id, 960, "image/jpeg")) : null;
  return {
    nom: r.nom,
    accent: r.accent,
    logo,
    titre: `${v.marque} ${v.modele}`,
    sousTitre: [v.version, v.annee, v.kilometrage !== null ? kmSite(v.kilometrage) : null].filter(Boolean).join(" · ") || null,
    prix: v.disponibilite === "VENDU" ? null : prixSite(v.prixCentimes),
    photo: couverture,
    badge: v.disponibilite === "VENDU" ? "Vendu" : v.disponibilite === "RESERVE" ? "Réservé" : null,
    whatsapp: !!r.whatsapp && v.disponibilite !== "VENDU",
    prive,
  };
}
