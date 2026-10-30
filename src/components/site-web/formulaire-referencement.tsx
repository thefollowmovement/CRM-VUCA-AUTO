"use client";

import { useRouter } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { schemaSiteReferencement, type SaisieSiteReferencement } from "@/lib/validations/site";
import { enregistrerSiteReferencement } from "@/server/actions/site";

function Compteur({ n, max }: { n: number; max: number }) {
  return <span className={cn("tabular-nums", n > max && "text-destructive")}>{n} / {max} caractères</span>;
}

export function FormulaireReferencement({ valeurs, titreDefaut, descriptionDefaut, domaine }: { valeurs: SaisieSiteReferencement; titreDefaut: string; descriptionDefaut: string; domaine: string }) {
  const router = useRouter();
  const { register, handleSubmit, getValues, watch, setError, reset, formState: { errors, isSubmitting } } = useFormulaire(schemaSiteReferencement, valeurs);
  const titre = String(watch("seoTitre") ?? "");
  const description = String(watch("seoDescription") ?? "");

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSiteReferencement(getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-4"
    >
      <Champ label="Titre pour Google (accueil)" htmlFor="seoTitre" erreur={errors.seoTitre?.message} aide={<Compteur n={titre.length} max={60} />}>
        <Input id="seoTitre" placeholder={titreDefaut} {...register("seoTitre")} />
      </Champ>
      <Champ label="Description pour Google (accueil)" htmlFor="seoDescription" erreur={errors.seoDescription?.message} aide={<Compteur n={description.length} max={160} />}>
        <Textarea id="seoDescription" rows={3} placeholder={descriptionDefaut} {...register("seoDescription")} />
      </Champ>
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Aperçu dans Google</p>
        <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{domaine}</p>
        <p className="truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{titre || titreDefaut}</p>
        <p className="line-clamp-2 text-sm text-neutral-700 dark:text-neutral-300">{description || descriptionDefaut}</p>
      </div>
      <h3 className="mt-2 font-semibold">Mesure d&apos;audience</h3>
      <Champ label="Plausible : domaine du site" htmlFor="plausibleDomaine" erreur={errors.plausibleDomaine?.message} aide="Recommandé : Plausible ne dépose aucun cookie (pas de bandeau à afficher). Exemple : vuca-auto.fr.">
        <Input id="plausibleDomaine" placeholder="vuca-auto.fr" {...register("plausibleDomaine")} />
      </Champ>
      <Champ label="Google Analytics : identifiant" htmlFor="googleAnalyticsId" erreur={errors.googleAnalyticsId?.message} aide="Facultatif (G-XXXXXXX). Google Analytics dépose des cookies : il ne sera chargé qu'après accord du visiteur.">
        <Input id="googleAnalyticsId" placeholder="G-ABC123XYZ" {...register("googleAnalyticsId")} />
      </Champ>
      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
