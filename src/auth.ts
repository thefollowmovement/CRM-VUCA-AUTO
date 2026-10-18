// Authentification complète : email + mot de passe (bcrypt), sessions JWT.
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";

const schemaIdentifiants = z.object({
  email: z.string().trim().toLowerCase().email(),
  motDePasse: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, motDePasse: {} },
      async authorize(identifiants) {
        const lecture = schemaIdentifiants.safeParse(identifiants);
        if (!lecture.success) return null;
        const { email, motDePasse } = lecture.data;

        const utilisateur = await db.utilisateur.findUnique({ where: { email } });
        if (!utilisateur || !utilisateur.actif) return null;

        const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasseHash);
        if (!valide) return null;

        await db.utilisateur.update({
          where: { id: utilisateur.id },
          data: { derniereConnexionLe: new Date() },
        });
        await journaliser({
          utilisateurId: utilisateur.id,
          action: "CONNEXION",
          entite: "Utilisateur",
          entiteId: utilisateur.id,
        });

        return {
          id: utilisateur.id,
          name: utilisateur.nom,
          email: utilisateur.email,
          role: utilisateur.role,
          partenaireId: utilisateur.partenaireId,
        };
      },
    }),
  ],
});
