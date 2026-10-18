"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  schemaChangementMotDePasse,
  type SaisieChangementMotDePasse,
} from "@/lib/validations/utilisateur";
import { changerMonMotDePasse } from "@/server/actions/utilisateurs";

export function FormulaireMotDePasse({ redirection }: { redirection?: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaChangementMotDePasse, { actuel: "", nouveau: "", confirmation: "" });

  const soumettre = async (valeurs: SaisieChangementMotDePasse) => {
    if (traiterResultat(await changerMonMotDePasse(valeurs), setError)) {
      reset();
      if (redirection) router.push(redirection);
      else router.refresh();
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(soumettre)} className="flex flex-col gap-4">
      <Champ label="Mot de passe actuel" htmlFor="actuel" erreur={errors.actuel?.message}>
        <Input id="actuel" type="password" autoComplete="current-password" {...register("actuel")} />
      </Champ>
      <Champ label="Nouveau mot de passe" htmlFor="nouveau" erreur={errors.nouveau?.message}>
        <Input id="nouveau" type="password" autoComplete="new-password" {...register("nouveau")} />
      </Champ>
      <Champ label="Confirmer le nouveau mot de passe" htmlFor="confirmation" erreur={errors.confirmation?.message}>
        <Input id="confirmation" type="password" autoComplete="new-password" {...register("confirmation")} />
      </Champ>
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting && <LoaderCircle className="animate-spin" />}
        Enregistrer le mot de passe
      </Button>
    </form>
  );
}
