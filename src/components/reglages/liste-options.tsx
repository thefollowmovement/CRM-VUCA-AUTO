"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { centimesVersSaisie, formatEuros } from "@/lib/format";
import { schemaOptionLocation } from "@/lib/validations/reglages";
import { enregistrerOptionLocation, supprimerOptionLocation } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";

type Option = {
  id: string;
  libelle: string;
  modeTarif: "PAR_JOUR" | "FORFAIT";
  prixCentimes: number;
  plafondCentimes: number | null;
  ordre: number;
  actif: boolean;
};

export function ListeOptions({ options }: { options: Option[] }) {
  const router = useRouter();
  const [edition, setEdition] = useState<Option | "nouvelle" | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdition("nouvelle")}>
          <Plus /> Nouvelle option
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {options.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune option.</li>}
        {options.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{o.libelle}</p>
              <p className="text-sm text-muted-foreground">
                {formatEuros(o.prixCentimes)} {o.modeTarif === "PAR_JOUR" ? "/ jour" : "forfait"}
                {o.plafondCentimes !== null && ` · plafonné à ${formatEuros(o.plafondCentimes)}`}
              </p>
            </div>
            {!o.actif && <Badge variant="secondary">Désactivée</Badge>}
            <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEdition(o)}>
              <Pencil />
            </Button>
            <Confirmation
              titre={`Supprimer « ${o.libelle} » ?`}
              description="Les contrats existants conservent l'option telle qu'elle était."
              libelleConfirmer="Supprimer"
              onConfirmer={async () => {
                if (traiterResultat(await supprimerOptionLocation(o.id))) router.refresh();
              }}
            >
              <Button variant="ghost" size="icon" aria-label="Supprimer" className="text-destructive">
                <Trash />
              </Button>
            </Confirmation>
          </li>
        ))}
      </ul>
      {edition && (
        <DialogueOption
          option={edition === "nouvelle" ? null : edition}
          ordreSuivant={(options.at(-1)?.ordre ?? 0) + 10}
          onFermer={() => setEdition(null)}
        />
      )}
    </>
  );
}

function DialogueOption({ option, ordreSuivant, onFermer }: { option: Option | null; ordreSuivant: number; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaOptionLocation, {
    libelle: option?.libelle ?? "",
    modeTarif: option?.modeTarif ?? "PAR_JOUR",
    prix: centimesVersSaisie(option?.prixCentimes ?? null),
    plafond: centimesVersSaisie(option?.plafondCentimes ?? null),
    ordre: option?.ordre ?? ordreSuivant,
    actif: option?.actif ?? true,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{option ? "Modifier l'option" : "Nouvelle option"}</DialogTitle>
        </DialogHeader>
        <form noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await enregistrerOptionLocation(option?.id ?? null, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <Champ label="Libellé" htmlFor="libelle" obligatoire erreur={errors.libelle?.message}>
            <Input id="libelle" {...register("libelle")} />
          </Champ>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Prix" htmlFor="prix" obligatoire erreur={errors.prix?.message}>
              <ChampMontant id="prix" {...register("prix")} />
            </Champ>
            <Champ label="Facturation" htmlFor="modeTarif">
              <SelectNatif id="modeTarif" {...register("modeTarif")}>
                <option value="PAR_JOUR">Par jour</option>
                <option value="FORFAIT">Forfait</option>
              </SelectNatif>
            </Champ>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Plafond" htmlFor="plafond" erreur={errors.plafond?.message} aide="Facultatif (ex. 50 € max).">
              <ChampMontant id="plafond" {...register("plafond")} />
            </Champ>
            <Champ label="Ordre d'affichage" htmlFor="ordre" erreur={errors.ordre?.message}>
              <Input id="ordre" type="number" inputMode="numeric" {...register("ordre")} />
            </Champ>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <CaseACocher {...register("actif")} /> Proposée lors de la création d&apos;un contrat
          </label>
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
