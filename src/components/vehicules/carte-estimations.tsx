"use client";

import { Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatEuros } from "@/lib/format";
import { schemaEstimation } from "@/lib/validations/vehicule";
import { ajouterEstimation, supprimerEstimation } from "@/server/actions/vehicules";

type Estimation = { id: string; montantCentimes: number; estimeLe: Date; source: string | null; note: string | null };

export function CarteEstimations({
  vehiculeId,
  estimations,
  aujourdhui,
  modifiable,
}: {
  vehiculeId: string;
  estimations: Estimation[];
  aujourdhui: string;
  modifiable: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [derniere, ...anciennes] = estimations;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Valeur estimée</CardTitle>
          <CardDescription>Sert au calcul prévisionnel des véhicules non vendus.</CardDescription>
        </div>
        {modifiable && (
          <Button variant="outline" size="sm" onClick={() => setOuvert(true)}>
            <Plus /> Estimer
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {derniere ? (
          <>
            <p className="text-2xl font-bold tabular-nums">{formatEuros(derniere.montantCentimes)}</p>
            <p className="text-sm text-muted-foreground">
              le {formatDate(derniere.estimeLe)}
              {derniere.source && ` · ${derniere.source}`}
            </p>
            <ul className="mt-3 flex flex-col divide-y text-sm">
              {[derniere, ...anciennes].map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-muted-foreground">
                    {formatDate(e.estimeLe)}
                    {e.source && ` · ${e.source}`}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    {formatEuros(e.montantCentimes)}
                    {modifiable && (
                      <Confirmation
                        titre="Supprimer cette estimation ?"
                        libelleConfirmer="Supprimer"
                        onConfirmer={async () => {
                          if (traiterResultat(await supprimerEstimation(e.id))) router.refresh();
                        }}
                      >
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label="Supprimer">
                          <Trash className="size-3.5" />
                        </Button>
                      </Confirmation>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune estimation.</p>
        )}
      </CardContent>
      {ouvert && (
        <DialogueEstimation
          vehiculeId={vehiculeId}
          aujourdhui={aujourdhui}
          onFermer={() => setOuvert(false)}
        />
      )}
    </Card>
  );
}

function DialogueEstimation({ vehiculeId, aujourdhui, onFermer }: { vehiculeId: string; aujourdhui: string; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaEstimation, { montant: "", estimeLe: aujourdhui, source: "", note: "" });
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle estimation</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await ajouterEstimation(vehiculeId, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Valeur" htmlFor="montant" erreur={errors.montant?.message} obligatoire>
              <ChampMontant id="montant" autoFocus {...register("montant")} />
            </Champ>
            <Champ label="Date" htmlFor="estimeLe" erreur={errors.estimeLe?.message}>
              <Input id="estimeLe" type="date" {...register("estimeLe")} />
            </Champ>
          </div>
          <Champ label="Source" htmlFor="source" erreur={errors.source?.message} aide="Ex. : La Centrale, Argus, offre d'un garage…">
            <Input id="source" {...register("source")} />
          </Champ>
          <DialogFooter>
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
