"use client";

import { LoaderCircle, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { formatEuros } from "@/lib/format";
import { LIBELLES_TYPE_FRAIS, schemaFrais, TYPES_FRAIS } from "@/lib/validations/etat-des-lieux";
import { ajouterFrais, supprimerFrais } from "@/server/actions/contrats";

type Frais = { id: string; libelle: string; quantite: number; prixUnitaireCentimes: number; montantCentimes: number; proposeAutomatiquement: boolean };

/** Frais supplémentaires d'un contrat (retour, amende refacturée…). */
export function FraisContrat({ contratId, frais, modifiable }: { contratId: string; frais: Frais[]; modifiable: boolean }) {
  const router = useRouter();
  const [ajout, setAjout] = useState(false);
  const total = frais.reduce((a, f) => a + f.montantCentimes, 0);
  return (
    <div className="flex flex-col gap-2">
      {frais.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun frais supplémentaire.</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {frais.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block">{f.libelle}</span>
                {f.quantite > 1 && (
                  <span className="block text-xs text-muted-foreground">
                    {f.quantite} × {formatEuros(f.prixUnitaireCentimes)}
                  </span>
                )}
              </span>
              <span className="font-medium tabular-nums">{formatEuros(f.montantCentimes)}</span>
              {modifiable && (
                <Confirmation
                  titre="Retirer ce frais ?"
                  libelleConfirmer="Retirer"
                  onConfirmer={async () => {
                    if (traiterResultat(await supprimerFrais(f.id))) router.refresh();
                  }}
                >
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Retirer ${f.libelle}`}>
                    <Trash />
                  </Button>
                </Confirmation>
              )}
            </li>
          ))}
          <li className="flex justify-between py-2 font-semibold">
            <span>Total des frais</span>
            <span className="tabular-nums">{formatEuros(total)}</span>
          </li>
        </ul>
      )}
      {modifiable && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setAjout(true)}>
          <Plus /> Ajouter un frais
        </Button>
      )}
      {ajout && <DialogueFrais contratId={contratId} onFermer={() => setAjout(false)} />}
    </div>
  );
}

function DialogueFrais({ contratId, onFermer }: { contratId: string; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaFrais, { type: "AUTRE", libelle: "", quantite: "1", prixUnitaire: "" });
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un frais</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await ajouterFrais(contratId, getValues() as { type: string; libelle: string; quantite: string; prixUnitaire: string }), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
        >
          <Champ label="Type" htmlFor="frais-type" erreur={errors.type?.message}>
            <SelectNatif
              id="frais-type"
              {...register("type", {
                onChange: (e) => {
                  if (!getValues("libelle")) setValue("libelle", LIBELLES_TYPE_FRAIS[e.target.value as keyof typeof LIBELLES_TYPE_FRAIS]);
                },
              })}
            >
              {TYPES_FRAIS.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPE_FRAIS[t]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Libellé" htmlFor="frais-libelle" erreur={errors.libelle?.message} obligatoire>
            <Input id="frais-libelle" {...register("libelle")} />
          </Champ>
          <Champ label="Quantité" htmlFor="frais-quantite" erreur={errors.quantite?.message}>
            <Input id="frais-quantite" inputMode="numeric" {...register("quantite")} />
          </Champ>
          <Champ label="Prix unitaire" htmlFor="frais-prix" erreur={errors.prixUnitaire?.message} obligatoire>
            <ChampMontant id="frais-prix" {...register("prixUnitaire")} />
          </Champ>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
