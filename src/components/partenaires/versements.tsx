"use client";

import { FileText, HandCoins, LoaderCircle, Pencil, Plus, Trash } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { aujourdhuiISO, centimesVersSaisie, dateCalendaireVersISO, formatDate, formatEuros } from "@/lib/format";
import { LIBELLES_MODE_PAIEMENT, LIBELLES_TYPE_VERSEMENT, MODES_PAIEMENT, schemaVersement, TYPES_VERSEMENT, type SaisieVersement } from "@/lib/validations/finance";
import { enregistrerVersement, supprimerVersement } from "@/server/actions/versements";

export type VersementAffiche = {
  id: string;
  date: Date;
  type: (typeof TYPES_VERSEMENT)[number];
  montantCentimes: number;
  mode: (typeof MODES_PAIEMENT)[number] | null;
  reference: string | null;
  note: string | null;
  vehiculeId: string | null;
  vehicule: string | null;
};
export type VehiculeVersement = { id: string; libelle: string; resteDuCentimes: number | null };

/** Versements d'un investisseur : liste, saisie, modification, suppression (admin). */
export function Versements({
  partenaireId,
  versements,
  vehicules,
  estAdmin,
}: {
  partenaireId: string;
  versements: VersementAffiche[];
  vehicules: VehiculeVersement[];
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [edition, setEdition] = useState<VersementAffiche | "nouveau" | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {versements.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <HandCoins className="size-4" /> Aucun versement enregistré.
        </p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {versements.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {formatDate(v.date)} · {LIBELLES_TYPE_VERSEMENT[v.type]}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[v.vehicule ?? "Sans véhicule", v.mode && LIBELLES_MODE_PAIEMENT[v.mode], v.reference, v.note].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className={`font-semibold tabular-nums ${v.type === "APPORT_SUPPLEMENTAIRE" ? "text-muted-foreground" : ""}`}>
                {v.type === "APPORT_SUPPLEMENTAIRE" ? "+" : ""}
                {formatEuros(v.montantCentimes)}
              </span>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Modifier le versement" onClick={() => setEdition(v)}>
                <Pencil />
              </Button>
              {estAdmin && (
                <Confirmation
                  titre="Supprimer ce versement ?"
                  description="Réservé aux erreurs de saisie : le reste dû sera recalculé."
                  libelleConfirmer="Supprimer"
                  onConfirmer={async () => {
                    if (traiterResultat(await supprimerVersement(v.id))) router.refresh();
                  }}
                >
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Supprimer le versement">
                    <Trash />
                  </Button>
                </Confirmation>
              )}
            </li>
          ))}
        </ul>
      )}
      <Button className="self-start" onClick={() => setEdition("nouveau")}>
        <Plus /> Nouveau versement
      </Button>
      {edition && (
        <DialogueVersement
          partenaireId={partenaireId}
          versement={edition === "nouveau" ? null : edition}
          vehicules={vehicules}
          onFermer={() => setEdition(null)}
        />
      )}
    </div>
  );
}

function DialogueVersement({
  partenaireId,
  versement,
  vehicules,
  onFermer,
}: {
  partenaireId: string;
  versement: VersementAffiche | null;
  vehicules: VehiculeVersement[];
  onFermer: () => void;
}) {
  const router = useRouter();
  // Nouveau versement : véhicule avec le plus gros reste dû proposé
  const propose = versement ? null : [...vehicules].filter((v) => (v.resteDuCentimes ?? 0) > 0).sort((a, b) => b.resteDuCentimes! - a.resteDuCentimes!)[0];
  const valeurs: SaisieVersement = versement
    ? {
        vehiculeId: versement.vehiculeId ?? "",
        date: dateCalendaireVersISO(versement.date),
        montant: centimesVersSaisie(versement.montantCentimes),
        type: versement.type,
        mode: versement.mode ?? "",
        reference: versement.reference ?? "",
        note: versement.note ?? "",
      }
    : { vehiculeId: propose?.id ?? "", date: aujourdhuiISO(), montant: propose ? centimesVersSaisie(propose.resteDuCentimes) : "", type: "REMBOURSEMENT_CAPITAL", mode: "VIREMENT", reference: "", note: "" };
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaVersement, valeurs);
  const vehicule = vehicules.find((v) => v.id === watch("vehiculeId"));
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{versement ? "Modifier le versement" : "Nouveau versement"}</DialogTitle>
          <DialogDescription>Argent remis à l&apos;investisseur (capital, bénéfice) ou apport supplémentaire de sa part.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await enregistrerVersement(partenaireId, versement?.id ?? null, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
        >
          <Champ label="Véhicule" htmlFor="versement-vehicule" erreur={errors.vehiculeId?.message} className="sm:col-span-2">
            <SelectNatif id="versement-vehicule" {...register("vehiculeId")}>
              <option value="">Sans véhicule (versement global)</option>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.libelle}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          {vehicule && vehicule.resteDuCentimes !== null && (
            <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
              Reste dû sur ce véhicule : <strong className="text-foreground">{formatEuros(vehicule.resteDuCentimes)}</strong>
              {vehicule.resteDuCentimes > 0 && (
                <button type="button" className="text-primary underline" onClick={() => setValue("montant", centimesVersSaisie(vehicule.resteDuCentimes))}>
                  Utiliser ce montant
                </button>
              )}
            </p>
          )}
          <Champ label="Montant" htmlFor="versement-montant" erreur={errors.montant?.message} obligatoire>
            <ChampMontant id="versement-montant" {...register("montant")} />
          </Champ>
          <Champ label="Date" htmlFor="versement-date" erreur={errors.date?.message} obligatoire>
            <Input id="versement-date" type="date" {...register("date")} />
          </Champ>
          <Champ label="Type" htmlFor="versement-type" erreur={errors.type?.message}>
            <SelectNatif id="versement-type" {...register("type")}>
              {TYPES_VERSEMENT.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPE_VERSEMENT[t]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Mode" htmlFor="versement-mode" erreur={errors.mode?.message}>
            <SelectNatif id="versement-mode" {...register("mode")}>
              <option value="">—</option>
              {MODES_PAIEMENT.map((m) => (
                <option key={m} value={m}>
                  {LIBELLES_MODE_PAIEMENT[m]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Référence" htmlFor="versement-reference" erreur={errors.reference?.message}>
            <Input id="versement-reference" {...register("reference")} />
          </Champ>
          <Champ label="Note" htmlFor="versement-note" erreur={errors.note?.message} className="sm:col-span-2">
            <Textarea id="versement-note" rows={2} {...register("note")} />
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

/** Relevé PDF de l'investisseur sur une période (par défaut : depuis le 1er janvier). */
export function ReleveInvestisseur({ partenaireId, nom }: { partenaireId: string; nom: string }) {
  const auj = aujourdhuiISO();
  const [du, setDu] = useState(`${auj.slice(0, 4)}-01-01`);
  const [au, setAu] = useState(auj);
  const valide = /^\d{4}-\d{2}-\d{2}$/.test(du) && /^\d{4}-\d{2}-\d{2}$/.test(au) && du <= au;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Du
          <Input type="date" value={du} onChange={(e) => setDu(e.target.value)} className="w-40" aria-label="Début du relevé" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Au
          <Input type="date" value={au} onChange={(e) => setAu(e.target.value)} className="w-40" aria-label="Fin du relevé" />
        </label>
      </div>
      {valide ? (
        <BoutonPdf url={`/api/pdf/releve/${partenaireId}?du=${du}&au=${au}`} libelle="Générer le relevé PDF" nomFichier={`releve-${nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${du}-${au}.pdf`} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <FileText className="size-4" /> Choisissez une période valide.
        </p>
      )}
    </div>
  );
}
