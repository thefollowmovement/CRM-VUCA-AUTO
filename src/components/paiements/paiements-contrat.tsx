"use client";

import { HandCoins, LoaderCircle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoutonPdf } from "@/components/documents/bouton-pdf";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { aujourdhuiISO, centimesVersSaisie, formatDate, formatEuros } from "@/lib/format";
import { LIBELLES_MODE_PAIEMENT, MODES_PAIEMENT } from "@/lib/validations/finance";
import { LIBELLES_NATURE_PAIEMENT, NATURES_PAIEMENT, schemaPaiement, type SaisiePaiement } from "@/lib/validations/paiement";
import { encaisserPaiement, supprimerPaiement } from "@/server/actions/paiements";

export type PaiementAffiche = { id: string; date: Date; nature: string; mode: string; montantCentimes: number; numeroRecu: string | null; reference: string | null; echeance: string | null };

/** Paiements d'un contrat : liste, reçus PDF, encaissement (paiements partiels acceptés). */
export function PaiementsContrat({
  contratId,
  paiements,
  proposition,
  modifiable,
  estAdmin,
  ouvrir = false,
}: {
  contratId: string;
  paiements: PaiementAffiche[];
  proposition: { montantCentimes: number; nature: "LOCATION" | "FRAIS" | "REMBOURSEMENT" };
  modifiable: boolean;
  estAdmin: boolean;
  ouvrir?: boolean;
}) {
  const router = useRouter();
  const [dialogue, setDialogue] = useState(ouvrir && modifiable);
  return (
    <div className="flex flex-col gap-3">
      {paiements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {paiements.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {formatDate(p.date)} · {LIBELLES_NATURE_PAIEMENT[p.nature] ?? p.nature}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {LIBELLES_MODE_PAIEMENT[p.mode as keyof typeof LIBELLES_MODE_PAIEMENT] ?? p.mode}
                  {p.reference && ` · ${p.reference}`}
                  {p.echeance && ` · ${p.echeance.replace(/ \(du .*\)$/, "")}`}
                </span>
              </span>
              <span className={`font-semibold tabular-nums ${p.nature === "REMBOURSEMENT" ? "text-destructive" : ""}`}>
                {p.nature === "REMBOURSEMENT" ? "−" : ""}
                {formatEuros(p.montantCentimes)}
              </span>
              {p.numeroRecu && <BoutonPdf url={`/api/pdf/recu/${p.id}`} libelle={p.numeroRecu} nomFichier={`recu-${p.numeroRecu}.pdf`} compact />}
              {estAdmin && p.nature !== "CAUTION_RETENUE" && (
                <Confirmation
                  titre="Supprimer ce paiement ?"
                  description="Réservé aux erreurs de saisie. Le numéro de reçu ne sera pas réutilisé."
                  libelleConfirmer="Supprimer"
                  onConfirmer={async () => {
                    if (traiterResultat(await supprimerPaiement(p.id))) router.refresh();
                  }}
                >
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Supprimer le paiement">
                    <Trash />
                  </Button>
                </Confirmation>
              )}
            </li>
          ))}
        </ul>
      )}
      {modifiable && (
        <Button className="self-start" onClick={() => setDialogue(true)}>
          <HandCoins /> Encaisser un paiement
        </Button>
      )}
      {dialogue && <DialoguePaiement contratId={contratId} proposition={proposition} onFermer={() => setDialogue(false)} />}
    </div>
  );
}

export function DialoguePaiement({ contratId, proposition, onFermer, apres }: { contratId: string; proposition: { montantCentimes: number; nature: "LOCATION" | "FRAIS" | "REMBOURSEMENT" }; onFermer: () => void; apres?: () => void }) {
  const router = useRouter();
  const valeurs: SaisiePaiement = {
    date: aujourdhuiISO(),
    montant: proposition.montantCentimes > 0 ? centimesVersSaisie(proposition.montantCentimes) : "",
    mode: "CARTE_BANCAIRE",
    nature: proposition.nature,
    reference: "",
    note: "",
  };
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaPaiement, valeurs);
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaisser un paiement</DialogTitle>
          <DialogDescription>Paiement partiel possible : il est imputé sur la plus ancienne échéance non réglée. Un reçu numéroté est créé.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await encaisserPaiement(contratId, getValues()), setError)) {
              onFermer();
              apres?.();
              router.refresh();
            }
          })}
          className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
        >
          <Champ label="Montant" htmlFor="paiement-montant" erreur={errors.montant?.message} obligatoire className="sm:col-span-2">
            <ChampMontant id="paiement-montant" className="h-12 text-xl font-semibold" {...register("montant")} />
          </Champ>
          <Champ label="Mode" htmlFor="paiement-mode" erreur={errors.mode?.message}>
            <SelectNatif id="paiement-mode" {...register("mode")}>
              {MODES_PAIEMENT.map((m) => (
                <option key={m} value={m}>
                  {LIBELLES_MODE_PAIEMENT[m]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Date" htmlFor="paiement-date" erreur={errors.date?.message}>
            <Input id="paiement-date" type="date" {...register("date")} />
          </Champ>
          <Champ label="Objet" htmlFor="paiement-nature" erreur={errors.nature?.message}>
            <SelectNatif id="paiement-nature" {...register("nature")}>
              {NATURES_PAIEMENT.map((n) => (
                <option key={n} value={n}>
                  {LIBELLES_NATURE_PAIEMENT[n]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Référence (n° de chèque…)" htmlFor="paiement-reference" erreur={errors.reference?.message}>
            <Input id="paiement-reference" {...register("reference")} />
          </Champ>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onFermer}>
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
