"use client";

import { useRouter } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Textarea } from "@/components/ui/textarea";
import { schemaDocuments, type SaisieDocuments } from "@/lib/validations/reglages";
import { enregistrerDocuments } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";

export function FormulaireDocuments({ valeurs }: { valeurs: SaisieDocuments }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaDocuments, valeurs);

  return (
    <form noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerDocuments(getValues()), setError)) router.refresh();
      })}
      className="flex flex-col gap-5"
    >
      <Champ
        label="Conditions générales de location"
        htmlFor="conditionsGenerales"
        erreur={errors.conditionsGenerales?.message}
        aide="Imprimées sur chaque contrat. Un contrat signé garde la version du jour de sa signature."
      >
        <Textarea id="conditionsGenerales" rows={16} className="font-mono text-xs md:text-xs" {...register("conditionsGenerales")} />
      </Champ>
      <Champ
        label="Mention sur les factures (sans TVA)"
        htmlFor="mentionFacture"
        erreur={errors.mentionFacture?.message}
        aide="Dépend de votre statut fiscal : faites valider ce texte par votre comptable."
      >
        <Textarea id="mentionFacture" rows={2} {...register("mentionFacture")} />
      </Champ>
      <Champ label="Mentions complémentaires du contrat" htmlFor="mentionsContrat" erreur={errors.mentionsContrat?.message}>
        <Textarea id="mentionsContrat" rows={3} {...register("mentionsContrat")} />
      </Champ>
      <Champ label="Mentions de l'état des lieux" htmlFor="mentionsEtatDesLieux" erreur={errors.mentionsEtatDesLieux?.message}>
        <Textarea id="mentionsEtatDesLieux" rows={3} {...register("mentionsEtatDesLieux")} />
      </Champ>
      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
