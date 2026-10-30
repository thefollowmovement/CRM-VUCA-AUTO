"use client";

import { Eye, PenLine, Sparkles, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { TexteRiche } from "@/components/site/texte-riche";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LONGUEUR_MAX_LEGAL } from "@/lib/site/legal";
import { schemaSiteLegal, type SaisieSiteLegal } from "@/lib/validations/site";
import { enregistrerSiteLegal } from "@/server/actions/site";

type Cle = keyof SaisieSiteLegal;

export function FormulaireLegal({ valeurs, modeles, manquants }: { valeurs: SaisieSiteLegal; modeles: Record<Cle, string>; manquants: string[] }) {
  const router = useRouter();
  const { register, handleSubmit, getValues, setValue, watch, setError, reset, formState: { errors, isSubmitting } } = useFormulaire(schemaSiteLegal, valeurs);
  const [apercu, setApercu] = useState<Cle | null>(null);

  const partirDuModele = (cle: Cle) => {
    if (String(getValues(cle) ?? "").trim() && !window.confirm("Remplacer le texte actuel par le modèle ?")) return;
    setValue(cle, modeles[cle], { shouldDirty: true });
    setApercu(null);
  };

  const bloc = (cle: Cle, libelle: string) => {
    const texte = String(watch(cle) ?? "");
    return (
      <Champ label={libelle} htmlFor={cle} erreur={errors[cle]?.message} aide="Vide = le modèle ci-dessus est affiché automatiquement sur le site.">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => partirDuModele(cle)}>
            <Sparkles /> Partir du modèle
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setApercu(apercu === cle ? null : cle)}>
            {apercu === cle ? <PenLine /> : <Eye />} {apercu === cle ? "Modifier" : "Aperçu"}
          </Button>
        </div>
        {apercu === cle ? (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
            <TexteRiche texte={texte.trim() ? texte : modeles[cle]} max={LONGUEUR_MAX_LEGAL} />
          </div>
        ) : (
          <Textarea id={cle} rows={12} placeholder="Vide : le modèle est utilisé." {...register(cle)} />
        )}
      </Champ>
    );
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSiteLegal(getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-6"
    >
      {manquants.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Informations manquantes (onglets Confiance et Contact) : {manquants.join(", ")}. Le modèle affiche « [à compléter] » à leur place.
          </span>
        </p>
      )}
      {bloc("mentionsLegales", "Mentions légales")}
      {bloc("confidentialite", "Politique de confidentialité")}
      <p className="text-xs text-muted-foreground">Les modèles sont un point de départ à relire : ils ne remplacent pas l&apos;avis d&apos;un professionnel du droit.</p>
      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
