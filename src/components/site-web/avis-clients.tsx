"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, ShieldCheck, Star, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { BoutonEnregistrer } from "@/components/reglages/bouton-enregistrer";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EtatVide } from "@/components/ui/etat-vide";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LIBELLES_SOURCE_AVIS, schemaAvis, SOURCES_AVIS, type SaisieAvis } from "@/lib/validations/site";
import { deplacerAvis, enregistrerAvis, supprimerAvis } from "@/server/actions/site";

export type AvisListe = { id: string; saisie: SaisieAvis; date: Date };

function Etoiles({ note, className }: { note: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= note ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden />
      ))}
    </span>
  );
}

/** Avis clients : uniquement des avis réels, dont l'authenticité est certifiée. */
export function AvisClients({ avis }: { avis: AvisListe[] }) {
  const router = useRouter();
  const [edition, setEdition] = useState<{ id: string | null; saisie: SaisieAvis } | null>(null);
  const vide: SaisieAvis = { auteur: "", note: "5", texte: "", date: "", vehiculeAchete: "", source: "GOOGLE", certifieAuthentique: false, actif: true };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>Uniquement des avis réels de vos clients (Google, Leboncoin, message reçu…), recopiés fidèlement. Publier de faux avis est interdit et sanctionné.</p>
      </div>
      <Button type="button" className="self-start" onClick={() => setEdition({ id: null, saisie: vide })}>
        <Plus /> Ajouter un avis
      </Button>
      {avis.length === 0 ? (
        <EtatVide icone={Star} titre="Aucun avis" description="Tant qu'il n'y a pas d'avis, la section « Avis » n'apparaît pas sur le site." />
      ) : (
        <ol className="flex flex-col gap-3">
          {avis.map((a, i) => (
            <li key={a.id} className={cn("rounded-lg border p-3", !a.saisie.actif && "opacity-60")} data-avis={a.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Etoiles note={Number(a.saisie.note)} />
                <span className="font-semibold">{a.saisie.auteur}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(a.date)} · {LIBELLES_SOURCE_AVIS[a.saisie.source]}
                </span>
                {!a.saisie.actif && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Masqué</span>}
                <div className="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Monter" disabled={i === 0} onClick={async () => traiterResultat(await deplacerAvis(a.id, "haut")) && router.refresh()}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Descendre" disabled={i === avis.length - 1} onClick={async () => traiterResultat(await deplacerAvis(a.id, "bas")) && router.refresh()}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Modifier l'avis" onClick={() => setEdition({ id: a.id, saisie: a.saisie })}>
                    <Pencil />
                  </Button>
                  <Confirmation titre="Supprimer cet avis ?" libelleConfirmer="Supprimer" onConfirmer={async () => void (traiterResultat(await supprimerAvis(a.id)) && router.refresh())}>
                    <Button type="button" variant="ghost" size="icon" aria-label="Supprimer l'avis" className="text-destructive">
                      <Trash />
                    </Button>
                  </Confirmation>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{a.saisie.texte}</p>
              {a.saisie.vehiculeAchete && <p className="mt-1 text-xs text-muted-foreground">Véhicule acheté : {a.saisie.vehiculeAchete}</p>}
            </li>
          ))}
        </ol>
      )}
      <Dialog open={!!edition} onOpenChange={(o) => !o && setEdition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edition?.id ? "Modifier l'avis" : "Nouvel avis"}</DialogTitle>
            <DialogDescription>Recopiez l&apos;avis tel que le client l&apos;a écrit.</DialogDescription>
          </DialogHeader>
          {edition && (
            <FormulaireAvis
              key={edition.id ?? "nouveau"}
              id={edition.id}
              valeurs={edition.saisie}
              onTermine={() => {
                setEdition(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormulaireAvis({ id, valeurs, onTermine }: { id: string | null; valeurs: SaisieAvis; onTermine: () => void }) {
  const { register, handleSubmit, getValues, setError, formState: { errors, isSubmitting } } = useFormulaire(schemaAvis, valeurs);
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerAvis(id, getValues()), setError)) onTermine();
      })}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Champ label="Prénom et initiale" htmlFor="auteur" obligatoire erreur={errors.auteur?.message}>
          <Input id="auteur" placeholder="Marie D." {...register("auteur")} />
        </Champ>
        <Champ label="Note" htmlFor="note" obligatoire erreur={errors.note?.message}>
          <SelectNatif id="note" {...register("note")}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
                {"☆".repeat(5 - n)} ({n}/5)
              </option>
            ))}
          </SelectNatif>
        </Champ>
        <Champ label="Date de l'avis" htmlFor="date" obligatoire erreur={errors.date?.message}>
          <Input id="date" type="date" {...register("date")} />
        </Champ>
        <Champ label="Source" htmlFor="source" obligatoire erreur={errors.source?.message}>
          <SelectNatif id="source" {...register("source")}>
            {SOURCES_AVIS.map((s) => (
              <option key={s} value={s}>
                {LIBELLES_SOURCE_AVIS[s]}
              </option>
            ))}
          </SelectNatif>
        </Champ>
      </div>
      <Champ label="Texte de l'avis" htmlFor="texte" obligatoire erreur={errors.texte?.message}>
        <Textarea id="texte" rows={4} {...register("texte")} />
      </Champ>
      <Champ label="Véhicule acheté" htmlFor="vehiculeAchete" erreur={errors.vehiculeAchete?.message} aide="Facultatif, ex. « Renault Clio 2019 ».">
        <Input id="vehiculeAchete" {...register("vehiculeAchete")} />
      </Champ>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <CaseACocher {...register("actif")} /> Afficher sur le site
      </label>
      <div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm font-medium">
          <CaseACocher className="mt-0.5" {...register("certifieAuthentique")} /> Je certifie que cet avis est authentique (rédigé par un vrai client).
        </label>
        {errors.certifieAuthentique?.message && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {errors.certifieAuthentique.message}
          </p>
        )}
      </div>
      <BoutonEnregistrer enCours={isSubmitting} libelle={id ? "Enregistrer" : "Ajouter l'avis"} />
    </form>
  );
}
