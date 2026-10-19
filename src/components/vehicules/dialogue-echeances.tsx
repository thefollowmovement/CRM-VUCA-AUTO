"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { schemaEcheances, type SaisieEcheances } from "@/lib/validations/vehicule";
import { modifierEcheances } from "@/server/actions/vehicules";

export function DialogueEcheances({ vehiculeId, valeurs }: { vehiculeId: string; valeurs: SaisieEcheances }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOuvert(true)}>
        <Pencil /> Mettre à jour
      </Button>
      {ouvert && <Formulaire vehiculeId={vehiculeId} valeurs={valeurs} onFermer={() => setOuvert(false)} />}
    </>
  );
}

function Formulaire({ vehiculeId, valeurs, onFermer }: { vehiculeId: string; valeurs: SaisieEcheances; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaEcheances, valeurs);
  const err = (n: keyof SaisieEcheances) => errors[n]?.message;
  const champ = (n: keyof SaisieEcheances, label: string, type: "date" | "km" | "texte") => (
    <Champ label={label} htmlFor={n} erreur={err(n)}>
      <Input id={n} type={type === "date" ? "date" : "text"} inputMode={type === "km" ? "numeric" : undefined} {...register(n)} />
    </Champ>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entretien et échéances</DialogTitle>
          <DialogDescription>Pensez à mettre à jour le kilométrage pour les alertes de vidange.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await modifierEcheances(vehiculeId, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="grid grid-cols-2 gap-4"
        >
          <div className="col-span-2">{champ("kilometrageActuel", "Kilométrage actuel", "km")}</div>
          {champ("dateProchainControleTechnique", "Prochain contrôle technique", "date")}
          {champ("dateEcheanceAssurance", "Échéance assurance", "date")}
          {champ("assureur", "Assureur", "texte")}
          {champ("numeroPoliceAssurance", "N° de police", "texte")}
          {champ("dateProchaineVidange", "Vidange (date)", "date")}
          {champ("kmProchaineVidange", "Vidange (km)", "km")}
          {champ("dateProchaineRevision", "Révision (date)", "date")}
          {champ("kmProchaineRevision", "Révision (km)", "km")}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <BoutonEnregistrer enCours={isSubmitting} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
