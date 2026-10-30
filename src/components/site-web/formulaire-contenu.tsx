"use client";

import { ArrowDown, ArrowUp, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray } from "react-hook-form";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIBELLES_RESEAUX, RESEAUX } from "@/lib/site/reglages-defaut";
import { schemaSiteContenu, type SaisieSiteContenu } from "@/lib/validations/site";
import { enregistrerSiteContenu } from "@/server/actions/site";

export function FormulaireContenu({ valeurs }: { valeurs: SaisieSiteContenu }) {
  const router = useRouter();
  const { register, control, handleSubmit, getValues, setError, reset, formState: { errors, isSubmitting } } = useFormulaire(schemaSiteContenu, valeurs);
  const faq = useFieldArray({ control, name: "faq" });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSiteContenu(getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">Accueil</h3>
        <Champ label="Grand titre" htmlFor="accueilTitre" erreur={errors.accueilTitre?.message} aide="Laissez vide pour le titre par défaut : « Des voitures d'occasion choisies avec soin. »">
          <Input id="accueilTitre" {...register("accueilTitre")} />
        </Champ>
        <Champ label="Sous-titre" htmlFor="accueilSousTitre" erreur={errors.accueilSousTitre?.message}>
          <Textarea id="accueilSousTitre" rows={2} {...register("accueilSousTitre")} />
        </Champ>
        <Champ label="Bandeau d'information" htmlFor="bandeau" erreur={errors.bandeau?.message} aide="Message court en haut du site (ex. « Fermé du 1er au 15 août »). Vide = pas de bandeau.">
          <Input id="bandeau" {...register("bandeau")} />
        </Champ>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">À propos</h3>
        <Champ label="Texte de la page « À propos »" htmlFor="aProposTexte" erreur={errors.aProposTexte?.message} aide="Qui vous êtes, comment vous choisissez vos véhicules. Gras (**texte**) et listes (- élément) acceptés.">
          <Textarea id="aProposTexte" rows={8} {...register("aProposTexte")} />
        </Champ>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">Questions fréquentes</h3>
        <ol className="flex flex-col gap-3">
          {faq.fields.map((f, i) => (
            <li key={f.id} className="flex flex-col gap-3 rounded-lg border p-3" data-faq={i}>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground">Question {i + 1}</span>
                <div className="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Monter" disabled={i === 0} onClick={() => faq.move(i, i - 1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Descendre" disabled={i === faq.fields.length - 1} onClick={() => faq.move(i, i + 1)}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la question" className="text-destructive" onClick={() => faq.remove(i)}>
                    <Trash />
                  </Button>
                </div>
              </div>
              <Champ label="Question" htmlFor={`faq-q-${i}`} erreur={errors.faq?.[i]?.question?.message}>
                <Input id={`faq-q-${i}`} {...register(`faq.${i}.question`)} />
              </Champ>
              <Champ label="Réponse" htmlFor={`faq-r-${i}`} erreur={errors.faq?.[i]?.reponse?.message}>
                <Textarea id={`faq-r-${i}`} rows={3} {...register(`faq.${i}.reponse`)} />
              </Champ>
            </li>
          ))}
        </ol>
        {faq.fields.length < 30 && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => faq.append({ question: "", reponse: "" })}>
            <Plus /> Ajouter une question
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">Réseaux sociaux et annonces</h3>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {RESEAUX.map((r) => (
            <Champ key={r} label={LIBELLES_RESEAUX[r]} htmlFor={`reseau-${r}`} erreur={errors.reseaux?.[r]?.message}>
              <Input id={`reseau-${r}`} type="url" placeholder="https://…" {...register(`reseaux.${r}`)} />
            </Champ>
          ))}
        </div>
      </section>

      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
