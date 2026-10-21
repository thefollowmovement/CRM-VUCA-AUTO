"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_GESTION } from "@/lib/permissions";
import { enregistrerFichier, supprimerFichier } from "@/lib/storage";
import { erreurValidation } from "@/lib/validations/erreurs";
import {
  schemaAvis,
  schemaSiteConfiance,
  schemaSiteContact,
  schemaSiteContenu,
  schemaSiteGeneral,
  schemaSiteLegal,
  schemaSiteReferencement,
  type SaisieAvis,
  type SaisieSiteConfiance,
  type SaisieSiteContact,
  type SaisieSiteContenu,
  type SaisieSiteGeneral,
  type SaisieSiteLegal,
  type SaisieSiteReferencement,
} from "@/lib/validations/site";
import { analyserDemo } from "@/server/demo";
import { CHAMPS_IMAGES_SITE, lireReglagesSite, type ChampImageSite } from "@/server/site/reglages";
import { revaliderSite } from "@/server/site/revalidation";

function rafraichir() {
  revalidatePath("/site-web", "layout");
  revaliderSite(); // le site public reflète immédiatement les réglages
}

/** Enregistre une section des réglages du site (ADMIN et GESTIONNAIRE). */
async function enregistrerSection<S extends z.ZodTypeAny>(schema: S, saisie: unknown, section: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schema.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const avant = await lireReglagesSite();
    const apres = await db.reglagesSite.update({ where: { id: 1 }, data: lecture.data as never });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: `ReglagesSite:${section}`, entiteId: "1", avant, apres });
    rafraichir();
    return { ok: true, message: "Réglages du site enregistrés." };
  });
}

export async function enregistrerSiteGeneral(saisie: SaisieSiteGeneral) {
  // Mise en ligne refusée tant que la démo est là : rien d'inventé ne doit apparaître publiquement
  if (saisie?.enLigne === true && !(await lireReglagesSite()).enLigne) {
    const demo = await analyserDemo();
    if (demo.vehicules.length + demo.clients.length + demo.investisseurs.length + demo.reglagesSite.length > 0) {
      return { ok: false as const, message: "Retirez d'abord la démonstration (Réglages → Démonstration) : le site ne doit montrer que vos vraies voitures." };
    }
  }
  return enregistrerSection(schemaSiteGeneral, saisie, "general");
}
export async function enregistrerSiteContact(saisie: SaisieSiteContact) {
  return enregistrerSection(schemaSiteContact, saisie, "contact");
}
export async function enregistrerSiteConfiance(saisie: SaisieSiteConfiance) {
  return enregistrerSection(schemaSiteConfiance, saisie, "confiance");
}
export async function enregistrerSiteContenu(saisie: SaisieSiteContenu) {
  return enregistrerSection(schemaSiteContenu, saisie, "contenu");
}
export async function enregistrerSiteReferencement(saisie: SaisieSiteReferencement) {
  return enregistrerSection(schemaSiteReferencement, saisie, "referencement");
}
export async function enregistrerSiteLegal(saisie: SaisieSiteLegal) {
  return enregistrerSection(schemaSiteLegal, saisie, "legal");
}

// ---------------------------------------------------------------------
//  Images du site (logos, favicon, photos « À propos » et vendeur, image de partage)
// ---------------------------------------------------------------------

/** FormData : « champ » (logoClairId, faviconId…) + « image ». Les logos gardent leur transparence. */
export async function envoyerImageSite(formulaire: FormData) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const champ = String(formulaire.get("champ") ?? "") as ChampImageSite;
    if (!(CHAMPS_IMAGES_SITE as readonly string[]).includes(champ)) throw new ErreurMetier("Image inconnue.");
    const fichier = formulaire.get("image");
    if (!(fichier instanceof File) || fichier.size === 0) throw new ErreurMetier("Choisissez une image.");
    const transparence = champ === "logoClairId" || champ === "logoFonceId" || champ === "faviconId";
    const avant = await lireReglagesSite();
    const nouveau = await enregistrerFichier({
      fichier,
      categorie: "IMAGE_SITE",
      typesAutorises: transparence ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "image/heic"],
      utilisateurId: u.id,
      optimiser: !transparence,
    });
    await db.reglagesSite.update({ where: { id: 1 }, data: { [champ]: nouveau.id } });
    const ancien = avant[champ];
    if (ancien) await supprimerFichier(ancien);
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ReglagesSite:image", entiteId: "1", avant: { [champ]: ancien }, apres: { [champ]: nouveau.id } });
    rafraichir();
    return { ok: true, message: "Image enregistrée." };
  });
}

export async function retirerImageSite(champ: ChampImageSite) {
  return avecDroits(ROLES_GESTION, async (u) => {
    if (!(CHAMPS_IMAGES_SITE as readonly string[]).includes(champ)) throw new ErreurMetier("Image inconnue.");
    const r = await lireReglagesSite();
    const ancien = r[champ];
    if (ancien) {
      await db.reglagesSite.update({ where: { id: 1 }, data: { [champ]: null } });
      await supprimerFichier(ancien);
      await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "ReglagesSite:image", entiteId: "1", avant: { [champ]: ancien } });
    }
    rafraichir();
    return { ok: true, message: "Image retirée." };
  });
}

// ---------------------------------------------------------------------
//  Avis clients (réels, authenticité certifiée)
// ---------------------------------------------------------------------

export async function enregistrerAvis(id: string | null, saisie: SaisieAvis) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const lecture = schemaAvis.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const d = lecture.data;
    const avant = id ? await db.avisClient.findUnique({ where: { id } }) : null;
    if (id && !avant) throw new ErreurMetier("Avis introuvable.");
    const dernier = id ? null : await db.avisClient.aggregate({ _max: { ordre: true } });
    const apres = id
      ? await db.avisClient.update({ where: { id }, data: d })
      : await db.avisClient.create({ data: { ...d, ordre: (dernier?._max.ordre ?? -1) + 1 } });
    await journaliser({ utilisateurId: u.id, action: id ? "MODIFICATION" : "CREATION", entite: "AvisClient", entiteId: apres.id, avant, apres });
    rafraichir();
    return { ok: true, message: "Avis enregistré." };
  });
}

export async function supprimerAvis(id: string) {
  return avecDroits(ROLES_GESTION, async (u) => {
    const avant = await db.avisClient.findUnique({ where: { id } });
    if (!avant) throw new ErreurMetier("Avis introuvable.");
    await db.avisClient.delete({ where: { id } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "AvisClient", entiteId: id, avant });
    rafraichir();
    return { ok: true, message: "Avis supprimé." };
  });
}

/** Monte ou descend un avis dans l'ordre d'affichage. */
export async function deplacerAvis(id: string, sens: "haut" | "bas") {
  return avecDroits(ROLES_GESTION, async () => {
    const avis = await db.avisClient.findMany({ orderBy: [{ ordre: "asc" }, { creeLe: "asc" }], select: { id: true } });
    const i = avis.findIndex((a) => a.id === id);
    const j = sens === "haut" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= avis.length) return { ok: true, message: "" };
    [avis[i], avis[j]] = [avis[j]!, avis[i]!];
    await db.$transaction(avis.map((a, k) => db.avisClient.update({ where: { id: a.id }, data: { ordre: k } })));
    rafraichir();
    return { ok: true, message: "Ordre mis à jour." };
  });
}
