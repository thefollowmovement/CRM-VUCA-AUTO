import type { z } from "zod";
import type { ResultatAction } from "@/lib/permissions";

/** Transforme une erreur Zod en résultat d'action avec erreurs par champ. */
export function erreurValidation(erreur: z.ZodError): ResultatAction<never> {
  const erreursChamps: Record<string, string[]> = {};
  for (const probleme of erreur.issues) {
    const cle = probleme.path.join(".") || "_";
    (erreursChamps[cle] ??= []).push(probleme.message);
  }
  return { ok: false, message: "Certains champs sont à corriger.", erreursChamps };
}
