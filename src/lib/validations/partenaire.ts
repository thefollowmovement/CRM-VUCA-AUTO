import { z } from "zod";
import { emailOptionnel, texte, texteOptionnel } from "./communs";

export const schemaPartenaire = z.object({
  nom: texte("Le nom", 120),
  telephone: texteOptionnel(30),
  email: emailOptionnel,
  iban: texteOptionnel(40)
    .transform((v) => (v ? v.replace(/\s/g, "").toUpperCase() : null))
    .refine((v) => v === null || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v), "IBAN invalide."),
  notes: texteOptionnel(2000),
});

export type SaisiePartenaire = z.input<typeof schemaPartenaire>;
