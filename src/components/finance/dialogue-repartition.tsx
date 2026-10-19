"use client";

import { Building, Settings2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { bpVersSaisie } from "@/lib/format";
import { cn } from "@/lib/utils";
import { schemaParametresRepartition, type SaisieParametresRepartition } from "@/lib/validations/finance";
import { enregistrerParametresRepartition } from "@/server/actions/vehicules";

type Partenaire = { id: string; nom: string; estSociete: boolean; partProrataBp: number };

/** Règles de répartition du bénéfice d'un véhicule (mode, commission, parts fixes). */
export function DialogueRepartition({
  vehiculeId,
  mode,
  commissionBp,
  partsFixes,
  partenaires,
}: {
  vehiculeId: string;
  mode: "PRORATA_INVESTISSEMENT" | "POURCENTAGE_FIXE";
  commissionBp: number;
  partsFixes: { partenaireId: string; pourcentageBp: number }[];
  /** Partenaires proposés pour les parts fixes, avec leur part au prorata (préremplissage). */
  partenaires: Partenaire[];
}) {
  const [ouvert, setOuvert] = useState(false);
  // Parts fixes existantes, sinon parts actuelles au prorata
  const valeurs: SaisieParametresRepartition = {
    mode,
    commission: commissionBp ? bpVersSaisie(commissionBp) : "",
    partsFixes: partenaires.map((p) => {
      const fixe = partsFixes.find((f) => f.partenaireId === p.id);
      return { partenaireId: p.id, pourcentage: bpVersSaisie(fixe ? fixe.pourcentageBp : mode === "POURCENTAGE_FIXE" ? 0 : p.partProrataBp) };
    }),
  };
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOuvert(true)}>
        <Settings2 /> Règles de partage
      </Button>
      {ouvert && <Formulaire vehiculeId={vehiculeId} valeurs={valeurs} partenaires={partenaires} onFermer={() => setOuvert(false)} />}
    </>
  );
}

function Formulaire({
  vehiculeId,
  valeurs,
  partenaires,
  onFermer,
}: {
  vehiculeId: string;
  valeurs: SaisieParametresRepartition;
  partenaires: Partenaire[];
  onFermer: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaParametresRepartition, valeurs);
  const mode = watch("mode");
  const parts = watch("partsFixes") ?? [];
  const total = parts.reduce((a, p) => {
    const n = Number(String(p.pourcentage ?? "").replace(",", ".").replace(/[\s%]/g, ""));
    return a + (Number.isFinite(n) ? n : 0);
  }, 0);
  const erreurParts = (errors.partsFixes as { message?: string; root?: { message?: string } } | undefined);

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Règles de partage du bénéfice</DialogTitle>
          <DialogDescription>Le capital investi est toujours rendu à chacun ; ces règles ne concernent que le bénéfice (ou la perte).</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await enregistrerParametresRepartition(vehiculeId, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <fieldset className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <legend className="mb-2 text-sm font-medium">Mode de partage</legend>
            {(
              [
                ["PRORATA_INVESTISSEMENT", "Au prorata de l'investissement", "Chacun reçoit une part du bénéfice égale à sa part de l'argent investi (achat + dépenses payées)."],
                ["POURCENTAGE_FIXE", "Pourcentages fixes", "Vous fixez la part de chacun (total 100 %), quel que soit l'argent investi."],
              ] as const
            ).map(([valeur, titre, aide]) => (
              <label
                key={valeur}
                className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm", mode === valeur && "border-primary bg-primary/5")}
              >
                <input type="radio" value={valeur} className="mt-1 accent-primary" {...register("mode")} />
                <span>
                  <span className="font-medium">{titre}</span>
                  <span className="block text-xs text-muted-foreground">{aide}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {mode === "POURCENTAGE_FIXE" && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              {partenaires.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm">
                    {p.estSociete ? <Building className="size-4 shrink-0 text-primary" /> : <UserRound className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{p.nom}</span>
                  </span>
                  <div className="relative w-28">
                    <Input inputMode="decimal" className="pr-7 text-right tabular-nums" aria-label={`Part de ${p.nom}`} {...register(`partsFixes.${i}.pourcentage`)} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => partenaires.forEach((p, i) => setValue(`partsFixes.${i}.pourcentage`, bpVersSaisie(p.partProrataBp)))}
                >
                  Reprendre le prorata
                </Button>
                <span className={cn("font-semibold tabular-nums", Math.abs(total - 100) > 0.001 && "text-destructive")}>
                  Total : {total.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %
                </span>
              </div>
              {(erreurParts?.message ?? erreurParts?.root?.message) && (
                <p className="text-sm text-destructive" role="alert">
                  {erreurParts?.message ?? erreurParts?.root?.message}
                </p>
              )}
            </div>
          )}

          <Champ
            label="Commission de gestion VUCA AUTO"
            htmlFor="commission"
            erreur={errors.commission?.message}
            aide="Prélevée d'abord sur le bénéfice (seulement s'il est positif), avant le partage. Vide = aucune."
          >
            <div className="relative w-32">
              <Input id="commission" inputMode="decimal" placeholder="0" className="pr-7 text-right tabular-nums" {...register("commission")} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
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
