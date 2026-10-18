import { z } from "zod";
import { texte } from "./communs";

export const schemaUtilisateur = z
  .object({
    nom: texte("Le nom", 120),
    email: z.string().trim().toLowerCase().email("Adresse email invalide."),
    role: z.enum(["ADMIN", "GESTIONNAIRE", "INVESTISSEUR_LECTURE"]),
    partenaireId: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v)),
    actif: z.boolean(),
  })
  .refine((u) => u.role !== "INVESTISSEUR_LECTURE" || u.partenaireId !== null, {
    message: "Choisissez l'investisseur que ce compte représente.",
    path: ["partenaireId"],
  });

export const schemaChangementMotDePasse = z
  .object({
    actuel: z.string().min(1, "Saisissez votre mot de passe actuel."),
    nouveau: z
      .string()
      .min(10, "10 caractères minimum.")
      .max(200)
      .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Mélangez lettres et chiffres."),
    confirmation: z.string(),
  })
  .refine((v) => v.nouveau === v.confirmation, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmation"],
  })
  .refine((v) => v.nouveau !== v.actuel, {
    message: "Le nouveau mot de passe doit être différent de l'actuel.",
    path: ["nouveau"],
  });

export type SaisieUtilisateur = z.input<typeof schemaUtilisateur>;
export type SaisieChangementMotDePasse = z.input<typeof schemaChangementMotDePasse>;
