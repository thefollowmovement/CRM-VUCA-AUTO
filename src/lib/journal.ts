// Journal d'activité : trace qui a créé / modifié / supprimé quoi.
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type ActionJournal =
  | "CREATION"
  | "MODIFICATION"
  | "SUPPRESSION"
  | "ARCHIVAGE"
  | "RESTAURATION"
  | "CONNEXION"
  | "MOT_DE_PASSE"
  | "ANONYMISATION";

type ClientOuTransaction = Pick<typeof db, "journalActivite">;

/** Convertit un objet (avec dates…) en JSON stockable. */
function versJson(valeur: unknown): Prisma.InputJsonValue | undefined {
  if (valeur === undefined || valeur === null) return undefined;
  return JSON.parse(JSON.stringify(valeur)) as Prisma.InputJsonValue;
}

/** Retire les champs sensibles avant de les écrire dans le journal. */
function nettoyer(valeur: unknown) {
  if (!valeur || typeof valeur !== "object") return valeur;
  const { motDePasseHash: _ignore, ...reste } = valeur as Record<string, unknown>;
  return reste;
}

export async function journaliser(
  entree: {
    utilisateurId?: string | null;
    action: ActionJournal;
    entite: string;
    entiteId?: string | null;
    avant?: unknown;
    apres?: unknown;
  },
  client: ClientOuTransaction = db,
) {
  await client.journalActivite.create({
    data: {
      utilisateurId: entree.utilisateurId ?? null,
      action: entree.action,
      entite: entree.entite,
      entiteId: entree.entiteId ?? null,
      avant: versJson(nettoyer(entree.avant)),
      apres: versJson(nettoyer(entree.apres)),
    },
  });
}
