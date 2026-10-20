"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";

export type EtatConnexion = { erreur?: string } | undefined;

export async function connexion(_etat: EtatConnexion, formulaire: FormData): Promise<EtatConnexion> {
  const email = String(formulaire.get("email") ?? "").trim().toLowerCase();
  // Un investisseur arrive directement sur son portail (l'adresse affichée reste juste)
  const compte = email ? await db.utilisateur.findUnique({ where: { email }, select: { role: true } }) : null;
  try {
    await signIn("credentials", {
      email,
      motDePasse: String(formulaire.get("motDePasse") ?? ""),
      redirectTo: compte?.role === "INVESTISSEUR_LECTURE" ? "/portail" : "/",
    });
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      return { erreur: "Email ou mot de passe incorrect, ou compte désactivé." };
    }
    throw erreur; // redirection après succès
  }
}

export async function deconnexion() {
  await signOut({ redirectTo: "/connexion" });
}
