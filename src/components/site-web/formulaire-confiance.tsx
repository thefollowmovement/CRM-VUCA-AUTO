"use client";

import { ArrowDown, ArrowUp, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { ICONES_ENGAGEMENT, LIBELLES_ICONES, MOYENS_PAIEMENT_PROPOSES } from "@/lib/site/reglages-defaut";
import { schemaSiteConfiance, type SaisieSiteConfiance } from "@/lib/validations/site";
import { enregistrerSiteConfiance } from "@/server/actions/site";

function CaseLigne({ children, ...props }: React.ComponentProps<typeof CaseACocher> & { children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <CaseACocher {...props} /> <span>{children}</span>
    </label>
  );
}

export function FormulaireConfiance({ valeurs }: { valeurs: SaisieSiteConfiance }) {
  const router = useRouter();
  const { register, control, handleSubmit, getValues, setValue, watch, setError, reset, formState: { errors, isSubmitting } } = useFormulaire(schemaSiteConfiance, valeurs);
  const engagements = useFieldArray({ control, name: "engagements" });
  const [autreMoyen, setAutreMoyen] = useState("");
  const moyens = (watch("moyensPaiement") ?? []) as string[];
  const tousMoyens = [...MOYENS_PAIEMENT_PROPOSES, ...moyens.filter((m) => !MOYENS_PAIEMENT_PROPOSES.includes(m))];
  const livraison = watch("livraison");
  const afficherVendus = watch("afficherVendus");
  const afficherNombre = watch("afficherNombreVendus");

  const basculerMoyen = (m: string, coche: boolean) =>
    setValue("moyensPaiement", coche ? [...moyens, m] : moyens.filter((x) => x !== m), { shouldDirty: true });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerSiteConfiance(getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4">
        <h3 className="font-semibold">Entreprise</h3>
        <p className="-mt-2 text-sm text-muted-foreground">Affichés en pied de page et dans les mentions légales : un SIRET visible rassure.</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Champ label="SIRET" htmlFor="siret" erreur={errors.siret?.message}>
            <Input id="siret" inputMode="numeric" placeholder="14 chiffres" {...register("siret")} />
          </Champ>
          <Champ label="Forme juridique" htmlFor="formeJuridique" erreur={errors.formeJuridique?.message}>
            <Input id="formeJuridique" placeholder="SAS, SARL, EI…" {...register("formeJuridique")} />
          </Champ>
          <Champ label="Adresse du siège" htmlFor="adresseSiege" erreur={errors.adresseSiege?.message} className="sm:col-span-2">
            <Input id="adresseSiege" {...register("adresseSiege")} />
          </Champ>
          <Champ label="Année de création" htmlFor="anneeCreation" erreur={errors.anneeCreation?.message} aide="Affiche « Depuis 2023 » (facultatif).">
            <Input id="anneeCreation" inputMode="numeric" className="max-w-32" {...register("anneeCreation")} />
          </Champ>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">Engagements</h3>
        <p className="-mt-1 text-sm text-muted-foreground">
          Les engagements cochés s&apos;affichent sur l&apos;accueil. N&apos;activez que ce que vous faites réellement.
        </p>
        {errors.engagements?.message && <p className="text-sm text-destructive">{errors.engagements.message}</p>}
        <ol className="flex flex-col gap-3">
          {engagements.fields.map((f, i) => (
            <li key={f.id} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border p-3" data-engagement={i}>
              <div className="flex flex-wrap items-center gap-2">
                <CaseLigne {...register(`engagements.${i}.actif`)}>Afficher</CaseLigne>
                <div className="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Monter" disabled={i === 0} onClick={() => engagements.move(i, i - 1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Descendre" disabled={i === engagements.fields.length - 1} onClick={() => engagements.move(i, i + 1)}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Supprimer l'engagement" className="text-destructive" onClick={() => engagements.remove(i)}>
                    <Trash />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <Champ label="Icône" htmlFor={`eng-icone-${i}`}>
                  <SelectNatif id={`eng-icone-${i}`} {...register(`engagements.${i}.icone`)}>
                    {ICONES_ENGAGEMENT.map((ic) => (
                      <option key={ic} value={ic}>
                        {LIBELLES_ICONES[ic]}
                      </option>
                    ))}
                  </SelectNatif>
                </Champ>
                <Champ label="Titre" htmlFor={`eng-titre-${i}`} erreur={errors.engagements?.[i]?.titre?.message}>
                  <Input id={`eng-titre-${i}`} {...register(`engagements.${i}.titre`)} />
                </Champ>
              </div>
              <Champ label="Phrase" htmlFor={`eng-phrase-${i}`} erreur={errors.engagements?.[i]?.phrase?.message}>
                <Input id={`eng-phrase-${i}`} {...register(`engagements.${i}.phrase`)} />
              </Champ>
            </li>
          ))}
        </ol>
        {engagements.fields.length < 12 && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => engagements.append({ icone: "star", titre: "", phrase: "", actif: true })}>
            <Plus /> Ajouter un engagement
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Paiement, livraison, reprise</h3>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Moyens de paiement acceptés</legend>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 sm:grid-cols-2">
            {tousMoyens.map((m) => (
              <CaseLigne key={m} checked={moyens.includes(m)} onChange={(e) => basculerMoyen(m, e.target.checked)}>
                {m}
              </CaseLigne>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <Input aria-label="Autre moyen de paiement" placeholder="Autre moyen…" value={autreMoyen} onChange={(e) => setAutreMoyen(e.target.value)} className="max-w-64" />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const t = autreMoyen.trim();
                if (t && !moyens.includes(t)) basculerMoyen(t, true);
                setAutreMoyen("");
              }}
            >
              <Plus /> Ajouter
            </Button>
          </div>
        </fieldset>
        <CaseLigne {...register("livraison")}>Livraison possible</CaseLigne>
        {livraison && (
          <Champ label="Zone de livraison" htmlFor="zoneLivraison" erreur={errors.zoneLivraison?.message}>
            <Input id="zoneLivraison" placeholder="Toute la France, Île-de-France…" {...register("zoneLivraison")} />
          </Champ>
        )}
        <CaseLigne {...register("reprise")}>Reprise de l&apos;ancien véhicule possible</CaseLigne>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Preuves</h3>
        <Champ label="Lien vers vos avis Google" htmlFor="lienAvisGoogle" erreur={errors.lienAvisGoogle?.message} aide="Affiché sous les avis clients : « Voir tous nos avis sur Google ».">
          <Input id="lienAvisGoogle" type="url" placeholder="https://g.page/r/…" {...register("lienAvisGoogle")} />
        </Champ>
        <CaseLigne {...register("afficherVendus")}>Montrer les véhicules vendus récemment (badge « Vendu », sans prix)</CaseLigne>
        {afficherVendus && (
          <Champ label="Vendus depuis moins de (jours)" htmlFor="joursVendus" erreur={errors.joursVendus?.message}>
            <Input id="joursVendus" inputMode="numeric" className="max-w-32" {...register("joursVendus")} />
          </Champ>
        )}
        <CaseLigne {...register("afficherNombreVendus")}>Afficher le nombre de véhicules vendus</CaseLigne>
        {afficherNombre && (
          <Champ label="À partir de (véhicules vendus)" htmlFor="seuilNombreVendus" erreur={errors.seuilNombreVendus?.message} aide="Le compteur reste masqué tant que ce nombre n'est pas atteint.">
            <Input id="seuilNombreVendus" inputMode="numeric" className="max-w-32" {...register("seuilNombreVendus")} />
          </Champ>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Confidentialité des annonces</h3>
        <CaseLigne {...register("immatriculationVisible")}>Afficher l&apos;immatriculation sur les annonces</CaseLigne>
        <p className="text-xs text-muted-foreground">Masquée par défaut. Le numéro de série (VIN) n&apos;est jamais affiché.</p>
      </section>

      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
