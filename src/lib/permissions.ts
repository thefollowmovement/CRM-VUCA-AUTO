// =====================================================================
//  Contrôle des droits — TOUJOURS côté serveur.
//  Chaque Server Action et chaque page sensible appelle ces fonctions :
//  masquer un bouton ne suffit jamais.
// =====================================================================
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const ROLES_GESTION: Role[] = ["ADMIN", "GESTIONNAIRE"];
export const ROLES_ADMIN: Role[] = ["ADMIN"];

export type UtilisateurCourant = {
  id: string;
  nom: string;
  email: string;
  role: Role;
  partenaireId: string | null;
  doitChangerMotDePasse: boolean;
};

export class ErreurAcces extends Error {
  constructor(message = "Vous n'avez pas les droits pour effectuer cette action.") {
    super(message);
    this.name = "ErreurAcces";
  }
}

/** Erreur « métier » dont le message peut être montré tel quel à l'utilisateur. */
export class ErreurMetier extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurMetier";
  }
}

/**
 * Utilisateur connecté, relu en base à chaque appel : un compte désactivé ou
 * dont le rôle a changé perd ses droits immédiatement.
 */
export async function utilisateurCourant(): Promise<UtilisateurCourant | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await db.utilisateur.findUnique({
    where: { id },
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      actif: true,
      partenaireId: true,
      doitChangerMotDePasse: true,
    },
  });
  if (!u || !u.actif) return null;
  const { actif: _actif, ...reste } = u;
  return reste;
}

/** Pour les pages : redirige vers la connexion si besoin. */
export async function exigerConnexionPage(): Promise<UtilisateurCourant> {
  const u = await utilisateurCourant();
  if (!u) redirect("/connexion");
  return u;
}

/** Pour les pages : redirige si le rôle ne convient pas. */
export async function exigerRolePage(roles: Role[]): Promise<UtilisateurCourant> {
  const u = await exigerConnexionPage();
  if (!roles.includes(u.role)) {
    redirect(u.role === "INVESTISSEUR_LECTURE" ? "/portail" : "/dashboard");
  }
  return u;
}

// ---------------------------------------------------------------------
//  Server Actions : résultat standard + gestion des erreurs
// ---------------------------------------------------------------------

export type ResultatAction<T = undefined> =
  | { ok: true; message?: string; donnees?: T }
  | { ok: false; message: string; erreursChamps?: Record<string, string[] | undefined> };

/**
 * Enveloppe une Server Action : vérifie la connexion et le rôle, puis
 * transforme les erreurs en message lisible (jamais de plantage brut).
 */
export async function avecDroits<T = undefined>(
  roles: Role[],
  traitement: (u: UtilisateurCourant) => Promise<ResultatAction<T>>,
): Promise<ResultatAction<T>> {
  try {
    const u = await utilisateurCourant();
    if (!u) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
    if (!roles.includes(u.role)) throw new ErreurAcces();
    return await traitement(u);
  } catch (erreur) {
    if (erreur instanceof ErreurAcces || erreur instanceof ErreurMetier) {
      return { ok: false, message: erreur.message };
    }
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
      return { ok: false, message: "Cette valeur existe déjà (doublon)." };
    }
    console.error("[Server Action]", erreur);
    return { ok: false, message: "Une erreur inattendue s'est produite. Réessayez." };
  }
}
