"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Formulaire React Hook Form validé par un schéma Zod partagé.
 * Les valeurs SAISIES (texte brut, ex. « 1 234,56 ») sont envoyées au serveur,
 * qui les revalide avec le même schéma : getValues() dans la soumission.
 */
export function useFormulaire<S extends z.ZodType<unknown, FieldValues>>(
  schema: S,
  valeursInitiales: z.input<S>,
) {
  return useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<z.input<S>, unknown, z.output<S>>,
    defaultValues: valeursInitiales as DefaultValues<z.input<S>>,
  });
}
