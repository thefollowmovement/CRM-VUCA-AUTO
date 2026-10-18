"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { schemaElementChecklist } from "@/lib/validations/reglages";
import { enregistrerElementChecklist, supprimerElementChecklist } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";

type Element = { id: string; libelle: string; avecQuantite: boolean; electriqueUniquement: boolean; ordre: number; actif: boolean };

export function ListeChecklist({ elements }: { elements: Element[] }) {
  const router = useRouter();
  const [edition, setEdition] = useState<Element | "nouveau" | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdition("nouveau")}>
          <Plus /> Nouvel élément
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {elements.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun élément.</li>}
        {elements.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <p className="min-w-0 flex-1 font-medium">{e.libelle}</p>
            {e.avecQuantite && <Badge variant="outline">Quantité</Badge>}
            {e.electriqueUniquement && <Badge variant="outline">Électrique</Badge>}
            {!e.actif && <Badge variant="secondary">Désactivé</Badge>}
            <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEdition(e)}>
              <Pencil />
            </Button>
            <Confirmation
              titre={`Supprimer « ${e.libelle} » ?`}
              description="Les états des lieux déjà réalisés ne sont pas modifiés."
              libelleConfirmer="Supprimer"
              onConfirmer={async () => {
                if (traiterResultat(await supprimerElementChecklist(e.id))) router.refresh();
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
        <DialogueElement
          element={edition === "nouveau" ? null : edition}
          ordreSuivant={(elements.at(-1)?.ordre ?? 0) + 10}
          onFermer={() => setEdition(null)}
        />
      )}
    </>
  );
}

function DialogueElement({ element, ordreSuivant, onFermer }: { element: Element | null; ordreSuivant: number; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaElementChecklist, {
    libelle: element?.libelle ?? "",
    avecQuantite: element?.avecQuantite ?? false,
    electriqueUniquement: element?.electriqueUniquement ?? false,
    ordre: element?.ordre ?? ordreSuivant,
    actif: element?.actif ?? true,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{element ? "Modifier l'élément" : "Nouvel élément"}</DialogTitle>
        </DialogHeader>
        <form noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await enregistrerElementChecklist(element?.id ?? null, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <Champ label="Libellé" htmlFor="libelle" obligatoire erreur={errors.libelle?.message}>
            <Input id="libelle" {...register("libelle")} />
          </Champ>
          <Champ label="Ordre d'affichage" htmlFor="ordre" erreur={errors.ordre?.message}>
            <Input id="ordre" type="number" inputMode="numeric" {...register("ordre")} />
          </Champ>
          <label className="flex items-center gap-2 text-sm">
            <CaseACocher {...register("avecQuantite")} /> Demander une quantité (ex. nombre de clés)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <CaseACocher {...register("electriqueUniquement")} /> Uniquement pour les véhicules électriques / hybrides rechargeables
          </label>
          <label className="flex items-center gap-2 text-sm">
            <CaseACocher {...register("actif")} /> Actif
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
