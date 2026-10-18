"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type EtatConnexion = { erreur?: string } | undefined;

export async function connexion(_etat: EtatConnexion, formulaire: FormData): Promise<EtatConnexion> {
  try {
    await signIn("credentials", {
      email: String(formulaire.get("email") ?? ""),
      motDePasse: String(formulaire.get("motDePasse") ?? ""),
      redirectTo: "/",
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
