// Protège toutes les pages : redirige vers /connexion si non connecté,
// et cantonne les investisseurs à leur portail.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Tout sauf l'API d'authentification, les fichiers statiques et les icônes PWA.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|icones|manifest.webmanifest).*)"],
};
