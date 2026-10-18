"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { schemaPartenaire, type SaisiePartenaire } from "@/lib/validations/partenaire";
import { creerPartenaire, modifierPartenaire } from "@/server/actions/partenaires";

type PartenaireExistant = {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  iban: string | null;
  notes: string | null;
};

/** Ajout (sans `partenaire`) ou modification d'un partenaire. */
export function DialoguePartenaire({
  partenaire,
  declencheur,
}: {
  partenaire?: PartenaireExistant;
  declencheur: React.ReactNode;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const valeursInitiales: SaisiePartenaire = {
    nom: partenaire?.nom ?? "",
    telephone: partenaire?.telephone ?? "",
    email: partenaire?.email ?? "",
    iban: partenaire?.iban ?? "",
    notes: partenaire?.notes ?? "",
  };
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaPartenaire, valeursInitiales);

  const soumettre = async () => {
    const valeurs = getValues();
    const resultat = partenaire
      ? await modifierPartenaire(partenaire.id, valeurs)
      : await creerPartenaire(valeurs);
    if (traiterResultat(resultat, setError)) {
      setOuvert(false);
      if (!partenaire && resultat.donnees) router.push(`/investisseurs/${resultat.donnees.id}`);
      else router.refresh();
    }
  };

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) reset(valeursInitiales);
      }}
    >
      <DialogTrigger asChild>{declencheur}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{partenaire ? "Modifier le partenaire" : "Nouvel investisseur"}</DialogTitle>
          <DialogDescription>Seul le nom est obligatoire.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(soumettre)} className="flex flex-col gap-4">
          <Champ label="Nom" htmlFor="nom" obligatoire erreur={errors.nom?.message}>
            <Input id="nom" autoComplete="off" {...register("nom")} />
          </Champ>
          <div className="grid gap-4 md:grid-cols-2">
            <Champ label="Téléphone" htmlFor="telephone" erreur={errors.telephone?.message}>
              <Input id="telephone" type="tel" inputMode="tel" {...register("telephone")} />
            </Champ>
            <Champ label="Email" htmlFor="email" erreur={errors.email?.message}>
              <Input id="email" type="email" inputMode="email" {...register("email")} />
            </Champ>
          </div>
          <Champ label="IBAN" htmlFor="iban" erreur={errors.iban?.message} aide="Facultatif. Affiché masqué dans l'application.">
            <Input id="iban" autoComplete="off" placeholder="FR76 …" {...register("iban")} />
          </Champ>
          <Champ label="Notes" htmlFor="notes" erreur={errors.notes?.message}>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </Champ>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
