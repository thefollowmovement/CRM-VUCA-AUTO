"use client";

import { useRouter } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Input } from "@/components/ui/input";
import { Interrupteur } from "@/components/ui/interrupteur";
import { schemaSiteGeneral, type SaisieSiteGeneral } from "@/lib/validations/site";
import { enregistrerSiteGeneral } from "@/server/actions/site";

export function FormulaireGeneral({ valeurs }: { valeurs: SaisieSiteGeneral }) {
  const router = useRouter();
  const { register, handleSubmit, getValues, setValue, watch, setError, reset, formState: { errors, isSubmitting } } = useFormulaire(schemaSiteGeneral, valeurs);
  const enLigne = watch("enLigne");
  const couleur = watch("couleurAccent");
  const couleurValide = /^#[0-9a-fA-F]{6}$/.test(couleur);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSiteGeneral(getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-4"
    >
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${enLigne ? "border-success/50 bg-success/5" : "border-amber-500/40 bg-amber-500/5"}`}>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{enLigne ? "Site en ligne" : "Site en maintenance"}</p>
          <p className="text-sm text-muted-foreground">
            {enLigne ? "Les visiteurs voient les annonces publiées." : "Les visiteurs voient une page « Bientôt en ligne » avec vos coordonnées. Vous seul voyez le site via l'aperçu."}
          </p>
        </div>
        <Interrupteur actif={enLigne} onChange={(v) => setValue("enLigne", v, { shouldDirty: true })} libelle="Site en ligne" />
      </div>
      <Champ label="Nom affiché" htmlFor="nomAffiche" obligatoire erreur={errors.nomAffiche?.message}>
        <Input id="nomAffiche" {...register("nomAffiche")} />
      </Champ>
      <Champ label="Slogan" htmlFor="slogan" erreur={errors.slogan?.message} aide="Une phrase courte, affichée sous le nom (facultatif).">
        <Input id="slogan" placeholder="Des voitures d'occasion choisies avec soin." {...register("slogan")} />
      </Champ>
      <Champ label="Couleur d'accent" htmlFor="couleurAccent" erreur={errors.couleurAccent?.message} aide="Utilisée avec parcimonie : boutons et liens. Le bleu par défaut (#0071E3) convient très bien.">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Choisir la couleur"
            value={couleurValide ? couleur : "#0071E3"}
            onChange={(e) => setValue("couleurAccent", e.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
            className="h-11 w-14 cursor-pointer rounded-md border bg-transparent p-1"
          />
          <Input id="couleurAccent" className="w-32 font-mono uppercase" {...register("couleurAccent")} />
          <span
            className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold text-white"
            style={{ backgroundColor: couleurValide ? couleur : "#0071E3" }}
          >
            Écrire sur WhatsApp
          </span>
        </div>
      </Champ>
      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
