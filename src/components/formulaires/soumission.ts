"use client";

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import type { ResultatAction } from "@/lib/permissions";

/**
 * Affiche le résultat d'une Server Action : toast de succès ou d'erreur,
 * et erreurs renvoyées par le serveur sur les champs concernés.
 * Renvoie true si l'action a réussi.
 */
export function traiterResultat<T extends FieldValues, D>(
  resultat: ResultatAction<D>,
  setError?: UseFormSetError<T>,
): resultat is { ok: true; message?: string; donnees?: D } {
  if (resultat.ok) {
    if (resultat.message) toast.success(resultat.message);
    return true;
  }
  toast.error(resultat.message);
  if (setError && resultat.erreursChamps) {
    for (const [champ, messages] of Object.entries(resultat.erreursChamps)) {
      if (messages?.[0]) setError(champ as Path<T>, { message: messages[0] });
    }
  }
  return false;
}
