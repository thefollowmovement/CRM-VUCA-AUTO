"use client";

import { useRouter } from "next/navigation";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Input } from "@/components/ui/input";
import { schemaReglagesAmendes, type SaisieReglagesAmendes } from "@/lib/validations/amendes";
import { enregistrerReglagesAmendes } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";

/** Paramètres › Amendes. `societe` = valeurs reprises quand un champ est laissé vide. */
export function FormulaireAmendes({ valeurs, societe }: { valeurs: SaisieReglagesAmendes; societe: { nom: string; adresse: string; codePostal: string; ville: string; email: string } }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaReglagesAmendes, valeurs);
  const repris = (v: string) => (v ? `Vide = « ${v} » (Réglages › Société)` : undefined);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerReglagesAmendes(getValues()), setError)) router.refresh();
      })}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Société destinataire des avis</legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <Champ
            label="Raison sociale exactement comme sur les avis"
            htmlFor="amendesRaisonSociale"
            erreur={errors.amendesRaisonSociale?.message}
            aide={repris(societe.nom)}
            className="md:col-span-2"
          >
            <Input id="amendesRaisonSociale" placeholder={societe.nom} {...register("amendesRaisonSociale")} />
          </Champ>
          <Champ label="Adresse du siège" htmlFor="amendesAdresse" erreur={errors.amendesAdresse?.message} aide={repris(societe.adresse)}>
            <Input id="amendesAdresse" placeholder={societe.adresse} autoComplete="address-line1" {...register("amendesAdresse")} />
          </Champ>
          <Champ label="Complément d'adresse" htmlFor="amendesAdresseComplement" erreur={errors.amendesAdresseComplement?.message}>
            <Input id="amendesAdresseComplement" autoComplete="address-line2" {...register("amendesAdresseComplement")} />
          </Champ>
          <Champ label="Code postal" htmlFor="amendesCodePostal" erreur={errors.amendesCodePostal?.message} aide={repris(societe.codePostal)}>
            <Input id="amendesCodePostal" placeholder={societe.codePostal} inputMode="numeric" autoComplete="postal-code" {...register("amendesCodePostal")} />
          </Champ>
          <Champ label="Ville" htmlFor="amendesVille" erreur={errors.amendesVille?.message} aide={repris(societe.ville)}>
            <Input id="amendesVille" placeholder={societe.ville} autoComplete="address-level2" {...register("amendesVille")} />
          </Champ>
          <Champ
            label="Email qui reçoit les confirmations de l'ANTAI"
            htmlFor="amendesEmail"
            erreur={errors.amendesEmail?.message}
            aide={repris(societe.email)}
            className="md:col-span-2"
          >
            <Input id="amendesEmail" type="email" placeholder={societe.email} autoComplete="email" {...register("amendesEmail")} />
          </Champ>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">Désignation et lecture des avis</legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <Champ label="Frais de gestion par PV désigné" htmlFor="amendesFraisGestionCentimes" erreur={errors.amendesFraisGestionCentimes?.message} aide="0 ou vide = pas de frais.">
            <ChampMontant id="amendesFraisGestionCentimes" {...register("amendesFraisGestionCentimes")} />
          </Champ>
          <Champ label="Modèle Claude utilisé pour lire les avis" htmlFor="amendesModele" erreur={errors.amendesModele?.message} aide="Par défaut : claude-haiku-5-5 (rapide et économique).">
            <Input id="amendesModele" spellCheck={false} {...register("amendesModele")} />
          </Champ>
        </div>
      </fieldset>
      <BoutonEnregistrer enCours={isSubmitting} />
    </form>
  );
}
