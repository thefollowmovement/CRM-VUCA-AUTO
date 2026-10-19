// Configuration Auth.js compatible « edge » (utilisée par le middleware).
// Aucun accès à la base ici : la vérification du mot de passe est dans auth.ts.
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/** Pages accessibles sans être connecté. */
const PAGES_PUBLIQUES = ["/connexion"];
/** Pages accessibles à un investisseur (lecture seule). */
const PAGES_INVESTISSEUR = ["/portail", "/compte", "/api/fichiers"];

export const authConfig = {
  pages: { signIn: "/connexion" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 }, // 14 jours
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const chemin = request.nextUrl.pathname;
      const connecte = !!auth?.user;
      const estPublique = PAGES_PUBLIQUES.some((p) => chemin.startsWith(p));

      if (estPublique) {
        // Déjà connecté : inutile de revoir la page de connexion.
        if (connecte) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }
      if (!connecte) return false; // → redirection vers /connexion

      // Un investisseur ne voit que son portail.
      if (auth.user.role === "INVESTISSEUR_LECTURE") {
        const autorise = PAGES_INVESTISSEUR.some((p) => chemin.startsWith(p));
        if (!autorise) return Response.redirect(new URL("/portail", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.partenaireId = user.partenaireId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.partenaireId = (token.partenaireId as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
