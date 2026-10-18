"use client";

import { useRouter } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Input } from "@/components/ui/input";
import { schemaSociete, type SaisieSociete } from "@/lib/validations/reglages";
import { enregistrerSociete } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";

export function FormulaireSociete({ valeurs }: { valeurs: SaisieSociete }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaSociete, valeurs);

  return (
    <form noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSociete(getValues()), setError)) router.refresh();
      })}
      className="flex flex-col gap-4"
    >
      <Champ label="Nom de la société" htmlFor="societeNom" obligatoire erreur={errors.societeNom?.message}>
        <Input id="societeNom" {...register("societeNom")} />
      </Champ>
      <Champ label="Adresse" htmlFor="societeAdresse" erreur={errors.societeAdresse?.message}>
        <Input id="societeAdresse" autoComplete="street-address" {...register("societeAdresse")} />
      </Champ>
      <div className="grid gap-4 md:grid-cols-[140px_1fr]">
        <Champ label="Code postal" htmlFor="societeCodePostal" erreur={errors.societeCodePostal?.message}>
          <Input id="societeCodePostal" inputMode="numeric" {...register("societeCodePostal")} />
        </Champ>
        <Champ label="Ville" htmlFor="societeVille" erreur={errors.societeVille?.message}>
          <Input id="societeVille" {...register("societeVille")} />
        </Champ>
      </div>
      <Champ label="SIRET" htmlFor="societeSiret" erreur={errors.societeSiret?.message}>
        <Input id="societeSiret" inputMode="numeric" placeholder="14 chiffres" {...register("societeSiret")} />
      </Champ>
      <div className="grid gap-4 md:grid-cols-2">
        <Champ label="Téléphone" htmlFor="societeTelephone" erreur={errors.societeTelephone?.message}>
          <Input id="societeTelephone" type="tel" {...register("societeTelephone")} />
        </Champ>
        <Champ label="Email" htmlFor="societeEmail" erreur={errors.societeEmail?.message}>
          <Input id="societeEmail" type="email" {...register("societeEmail")} />
        </Champ>
      </div>
      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
