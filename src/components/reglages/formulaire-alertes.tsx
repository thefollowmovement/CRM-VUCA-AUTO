"use client";

import { useRouter } from "next/navigation";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Input } from "@/components/ui/input";
import { schemaAlertes, type SaisieAlertes } from "@/lib/validations/reglages";
import { enregistrerAlertes } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";

const annee = new Date().getFullYear();

export function FormulaireAlertes({ valeurs }: { valeurs: SaisieAlertes }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaAlertes, valeurs);

  const exemple = (prefixe: unknown) => `${String(prefixe || "XXX").toUpperCase()}-${annee}-0001`;

  return (
    <form noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerAlertes(getValues()), setError)) router.refresh();
      })}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Numérotation</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <Champ label="Contrats" htmlFor="prefixeContrat" erreur={errors.prefixeContrat?.message} aide={exemple(watch("prefixeContrat"))}>
            <Input id="prefixeContrat" className="uppercase" {...register("prefixeContrat")} />
          </Champ>
          <Champ label="Factures" htmlFor="prefixeFacture" erreur={errors.prefixeFacture?.message} aide={exemple(watch("prefixeFacture"))}>
            <Input id="prefixeFacture" className="uppercase" {...register("prefixeFacture")} />
          </Champ>
          <Champ label="Reçus" htmlFor="prefixeRecu" erreur={errors.prefixeRecu?.message} aide={exemple(watch("prefixeRecu"))}>
            <Input id="prefixeRecu" className="uppercase" {...register("prefixeRecu")} />
          </Champ>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Seuils d&apos;alerte</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Champ label="Véhicule en stock depuis plus de (jours)" htmlFor="joursStockAlerte" erreur={errors.joursStockAlerte?.message}>
            <Input id="joursStockAlerte" type="number" inputMode="numeric" {...register("joursStockAlerte")} />
          </Champ>
          <Champ label="CT / assurance qui expire dans (jours)" htmlFor="joursAvantEcheanceAlerte" erreur={errors.joursAvantEcheanceAlerte?.message}>
            <Input id="joursAvantEcheanceAlerte" type="number" inputMode="numeric" {...register("joursAvantEcheanceAlerte")} />
          </Champ>
          <Champ label="Vidange / révision dans moins de (km)" htmlFor="kmAvantVidangeAlerte" erreur={errors.kmAvantVidangeAlerte?.message}>
            <Input id="kmAvantVidangeAlerte" type="number" inputMode="numeric" {...register("kmAvantVidangeAlerte")} />
          </Champ>
          <Champ label="Ancienneté minimale du permis (années)" htmlFor="anciennetePermisMinAnnees" erreur={errors.anciennetePermisMinAnnees?.message} aide="Alerte (pas de blocage) si le permis est plus récent.">
            <Input id="anciennetePermisMinAnnees" type="number" inputMode="numeric" {...register("anciennetePermisMinAnnees")} />
          </Champ>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Location</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Champ
            label="Tolérance de retard (minutes)"
            htmlFor="toleranceRetardMinutes"
            erreur={errors.toleranceRetardMinutes?.message}
            aide="Au-delà, une journée supplémentaire est due."
          >
            <Input id="toleranceRetardMinutes" type="number" inputMode="numeric" {...register("toleranceRetardMinutes")} />
          </Champ>
          <Champ
            label="Jour d'échéance mensuelle par défaut"
            htmlFor="jourEcheanceMensuelleDefaut"
            erreur={errors.jourEcheanceMensuelleDefaut?.message}
            aide="Entre 1 et 28."
          >
            <Input id="jourEcheanceMensuelleDefaut" type="number" inputMode="numeric" {...register("jourEcheanceMensuelleDefaut")} />
          </Champ>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Frais proposés au retour</legend>
        <p className="-mt-2 text-sm text-muted-foreground">L&apos;application les propose après la comparaison départ / retour ; vous les validez ou les modifiez.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Champ label="Nettoyage (véhicule rendu sale)" htmlFor="fraisNettoyageCentimes" erreur={errors.fraisNettoyageCentimes?.message}>
            <ChampMontant id="fraisNettoyageCentimes" {...register("fraisNettoyageCentimes")} />
          </Champ>
          <Champ label="Carburant : par 1/8 de réservoir manquant" htmlFor="prixHuitiemeCarburantCentimes" erreur={errors.prixHuitiemeCarburantCentimes?.message}>
            <ChampMontant id="prixHuitiemeCarburantCentimes" {...register("prixHuitiemeCarburantCentimes")} />
          </Champ>
          <Champ label="Électrique : par % de batterie manquant" htmlFor="prixPourcentBatterieCentimes" erreur={errors.prixPourcentBatterieCentimes?.message}>
            <ChampMontant id="prixPourcentBatterieCentimes" {...register("prixPourcentBatterieCentimes")} />
          </Champ>
        </div>
      </fieldset>

      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
