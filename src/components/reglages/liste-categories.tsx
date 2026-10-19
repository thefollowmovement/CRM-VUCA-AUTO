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
import { schemaCategorieDepense, type SaisieCategorieDepense } from "@/lib/validations/reglages";
import { enregistrerCategorieDepense, supprimerCategorieDepense } from "@/server/actions/reglages";
import { BoutonEnregistrer } from "./bouton-enregistrer";
import { ICONES_CATEGORIES, IconeCategorie } from "./icone-categorie";

type Categorie = { id: string; nom: string; icone: string | null; couleur: string | null; ordre: number; actif: boolean; nbDepenses: number };

export function ListeCategories({ categories }: { categories: Categorie[] }) {
  const router = useRouter();
  const [edition, setEdition] = useState<Categorie | "nouvelle" | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdition("nouvelle")}>
          <Plus /> Nouvelle catégorie
        </Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <IconeCategorie icone={c.icone} couleur={c.couleur} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.nom}</p>
              <p className="text-xs text-muted-foreground">{c.nbDepenses} dépense(s)</p>
            </div>
            {!c.actif && <Badge variant="secondary">Désactivée</Badge>}
            <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEdition(c)}>
              <Pencil />
            </Button>
            {c.nbDepenses === 0 && (
              <Confirmation
                titre={`Supprimer « ${c.nom} » ?`}
                libelleConfirmer="Supprimer"
                onConfirmer={async () => {
                  if (traiterResultat(await supprimerCategorieDepense(c.id))) router.refresh();
                }}
              >
                <Button variant="ghost" size="icon" aria-label="Supprimer" className="text-destructive">
                  <Trash />
                </Button>
              </Confirmation>
            )}
          </li>
        ))}
      </ul>
      {edition && (
        <DialogueCategorie
          categorie={edition === "nouvelle" ? null : edition}
          ordreSuivant={(categories.at(-1)?.ordre ?? 0) + 10}
          onFermer={() => setEdition(null)}
        />
      )}
    </>
  );
}

function DialogueCategorie({
  categorie,
  ordreSuivant,
  onFermer,
}: {
  categorie: Categorie | null;
  ordreSuivant: number;
  onFermer: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaCategorieDepense, {
    nom: categorie?.nom ?? "",
    icone: categorie?.icone ?? "Ellipsis",
    couleur: categorie?.couleur ?? "#2563eb",
    ordre: categorie?.ordre ?? ordreSuivant,
    actif: categorie?.actif ?? true,
  } satisfies SaisieCategorieDepense);
  const iconeChoisie = watch("icone");
  const couleur = watch("couleur");

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categorie ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>
        <form noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await enregistrerCategorieDepense(categorie?.id ?? null, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <Champ label="Nom" htmlFor="nom" obligatoire erreur={errors.nom?.message}>
            <Input id="nom" {...register("nom")} />
          </Champ>
          <Champ label="Icône">
            <div className="grid grid-cols-8 gap-1.5">
              {Object.entries(ICONES_CATEGORIES).map(([nom, Icone]) => (
                <button
                  key={nom}
                  type="button"
                  aria-label={nom}
                  onClick={() => setValue("icone", nom)}
                  className="flex aspect-square items-center justify-center rounded-lg border"
                  style={iconeChoisie === nom ? { borderColor: couleur, color: couleur, backgroundColor: `${couleur}22` } : undefined}
                >
                  <Icone className="size-4" />
                </button>
              ))}
            </div>
          </Champ>
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Couleur" htmlFor="couleur" erreur={errors.couleur?.message}>
              <Input id="couleur" type="color" className="p-1" {...register("couleur")} />
            </Champ>
            <Champ label="Ordre d'affichage" htmlFor="ordre" erreur={errors.ordre?.message}>
              <Input id="ordre" type="number" inputMode="numeric" {...register("ordre")} />
            </Champ>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <CaseACocher {...register("actif")} /> Proposée lors de la saisie d&apos;une dépense
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
