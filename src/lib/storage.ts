// =====================================================================
//  Stockage des fichiers (photos, justificatifs, scans, signatures).
//  Aujourd'hui : dossier local (STORAGE_DIR, volume Docker).
//  Demain : S3 / R2 — il suffira d'écrire une autre implémentation de
//  l'interface Stockage, sans toucher au reste de l'application.
// =====================================================================
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CategorieFichier } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { creerMiniature, detecterType, optimiserPhoto } from "@/lib/images";
import { ErreurMetier } from "@/lib/permissions";

export interface Stockage {
  enregistrer(cle: string, contenu: Buffer): Promise<void>;
  lire(cle: string): Promise<Buffer>;
  supprimer(cle: string): Promise<void>;
}

class StockageLocal implements Stockage {
  constructor(private racine: string) {}

  /** Empêche toute sortie du dossier de stockage (ex. « ../../etc »). */
  private chemin(cle: string) {
    const complet = path.resolve(this.racine, cle);
    if (!complet.startsWith(path.resolve(this.racine) + path.sep)) {
      throw new Error("Clé de stockage invalide");
    }
    return complet;
  }

  async enregistrer(cle: string, contenu: Buffer) {
    const chemin = this.chemin(cle);
    await mkdir(path.dirname(chemin), { recursive: true });
    await writeFile(chemin, contenu);
  }

  async lire(cle: string) {
    return readFile(this.chemin(cle));
  }

  async supprimer(cle: string) {
    await rm(this.chemin(cle), { force: true });
  }
}

export const stockage: Stockage = new StockageLocal(
  path.resolve(process.env.STORAGE_DIR ?? "./storage"),
);

export const TYPES_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const TYPES_DOCUMENTS = [...TYPES_IMAGES, "application/pdf"];
export const TAILLE_MAX_OCTETS = 15 * 1024 * 1024; // 15 Mo

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

/** Propriétaire d'un fichier : un seul champ renseigné. */
export type ProprietaireFichier = Partial<{
  vehiculeId: string;
  depenseId: string;
  clientId: string;
  contratId: string;
  etatDesLieuxId: string;
  dommageId: string;
  sinistreId: string;
  amendeId: string;
}>;

/**
 * Enregistre un fichier envoyé par l'utilisateur : contrôle du type RÉEL et
 * de la taille, optimisation des images (orientation, 1600 px, sans GPS),
 * écriture dans le stockage, puis création de la ligne Fichier.
 */
export async function enregistrerFichier(params: {
  fichier: File;
  categorie: CategorieFichier;
  typesAutorises?: string[];
  proprietaire?: ProprietaireFichier;
  utilisateurId: string;
  libelle?: string | null;
  ordre?: number;
  estPrincipale?: boolean;
  /** Réencoder les images en JPEG optimisé (par défaut oui, sauf pour le logo qui garde sa transparence). */
  optimiser?: boolean;
}) {
  const { fichier, categorie, utilisateurId } = params;
  const typesAutorises = params.typesAutorises ?? TYPES_DOCUMENTS;

  if (fichier.size === 0) throw new ErreurMetier("Le fichier est vide.");
  if (fichier.size > TAILLE_MAX_OCTETS) throw new ErreurMetier("Fichier trop volumineux (15 Mo maximum).");

  let contenu: Buffer = Buffer.from(await fichier.arrayBuffer());
  let type = detecterType(contenu);
  if (!type || !typesAutorises.includes(type)) {
    throw new ErreurMetier("Type de fichier non accepté (photo JPEG, PNG, WebP, HEIC ou PDF).");
  }

  if (type === "image/heic" && (params.optimiser === false || categorie === "LOGO")) {
    throw new ErreurMetier("Format HEIC non accepté ici : utilisez une image JPEG ou PNG.");
  }
  let largeur: number | null = null;
  let hauteur: number | null = null;
  const optimiser = params.optimiser ?? categorie !== "LOGO";
  if (type.startsWith("image/") && optimiser) {
    try {
      const optimisee = await optimiserPhoto(contenu);
      contenu = optimisee.contenu;
      largeur = optimisee.largeur;
      hauteur = optimisee.hauteur;
      type = "image/jpeg";
    } catch {
      throw new ErreurMetier("Cette image n'a pas pu être lue. Essayez une photo JPEG ou PNG.");
    }
  }

  const maintenant = new Date();
  const cle = [
    String(maintenant.getFullYear()),
    String(maintenant.getMonth() + 1).padStart(2, "0"),
    `${randomUUID()}${EXTENSIONS[type] ?? ""}`,
  ].join("/");

  await stockage.enregistrer(cle, contenu);

  const nomBase = fichier.name.slice(0, 200) || "fichier";
  return db.fichier.create({
    data: {
      categorie,
      cleStockage: cle,
      nomOriginal: type === "image/jpeg" ? nomBase.replace(/\.(png|webp|heic|heif|jpe?g)$/i, "") + ".jpg" : nomBase,
      typeMime: type,
      tailleOctets: contenu.length,
      largeur,
      hauteur,
      libelle: params.libelle ?? null,
      ordre: params.ordre ?? 0,
      estPrincipale: params.estPrincipale ?? false,
      envoyeParId: utilisateurId,
      ...params.proprietaire,
    },
  });
}

/** Lit la miniature d'une image (créée et mise en cache au premier appel). */
export async function lireMiniature(cleStockage: string): Promise<Buffer> {
  const cleMini = `miniatures/${cleStockage.replace(/\.[a-z]+$/i, "")}.jpg`;
  try {
    return await stockage.lire(cleMini);
  } catch {
    const mini = await creerMiniature(await stockage.lire(cleStockage));
    await stockage.enregistrer(cleMini, mini);
    return mini;
  }
}

/** Supprime la ligne Fichier puis le fichier physique (et sa miniature). */
export async function supprimerFichier(id: string) {
  const fichier = await db.fichier.delete({ where: { id } });
  await supprimerFichierStocke(fichier.cleStockage);
}

/** Supprime un fichier physique et sa miniature éventuelle. */
export async function supprimerFichierStocke(cleStockage: string) {
  await stockage.supprimer(cleStockage);
  await stockage.supprimer(`miniatures/${cleStockage.replace(/\.[a-z]+$/i, "")}.jpg`);
}
