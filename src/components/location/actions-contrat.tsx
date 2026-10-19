"use client";

import { Archive, ArchiveRestore, CircleCheck, Ellipsis, LoaderCircle, Pencil, Trash, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MenuDeroulant, MenuDeroulantContenu, MenuDeroulantDeclencheur, MenuDeroulantElement } from "@/components/ui/menu-deroulant";
import { Textarea } from "@/components/ui/textarea";
import type { StatutContrat } from "@/generated/prisma/enums";
import { schemaAnnulation } from "@/lib/validations/location";
import { annulerContrat, archiverContrat, confirmerContrat, restaurerContrat, supprimerContrat } from "@/server/actions/contrats";

export function ActionsContrat({ id, numero, statut, archive, estAdmin }: { id: string; numero: string; statut: StatutContrat; archive: boolean; estAdmin: boolean }) {
  const router = useRouter();
  const [annulation, setAnnulation] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const reserve = statut === "RESERVATION" || statut === "CONFIRMEE";
  const clos = statut === "TERMINEE" || statut === "ANNULEE";

  return (
    <div className="flex flex-wrap gap-2">
      {statut === "RESERVATION" && (
        <Button
          onClick={async () => {
            if (traiterResultat(await confirmerContrat(id))) router.refresh();
          }}
        >
          <CircleCheck /> Confirmer
        </Button>
      )}
      {reserve && (
        <Button variant="outline" asChild>
          <Link href={`/location/contrats/${id}/modifier`}>
            <Pencil /> Modifier
          </Link>
        </Button>
      )}
      {archive && (
        <Button
          variant="outline"
          onClick={async () => {
            if (traiterResultat(await restaurerContrat(id))) router.refresh();
          }}
        >
          <ArchiveRestore /> Restaurer
        </Button>
      )}
      {(reserve || (clos && !archive) || estAdmin) && (
        <MenuDeroulant>
          <MenuDeroulantDeclencheur asChild>
            <Button variant="ghost" size="icon" aria-label="Plus d'actions">
              <Ellipsis />
            </Button>
          </MenuDeroulantDeclencheur>
          <MenuDeroulantContenu align="end">
            {reserve && (
              <MenuDeroulantElement onSelect={() => setAnnulation(true)} className="text-destructive">
                <X /> Annuler la location
              </MenuDeroulantElement>
            )}
            {clos && !archive && (
              <MenuDeroulantElement
                onSelect={async () => {
                  if (traiterResultat(await archiverContrat(id))) router.refresh();
                }}
              >
                <Archive /> Archiver
              </MenuDeroulantElement>
            )}
            {estAdmin && (reserve || statut === "ANNULEE") && (
              <MenuDeroulantElement onSelect={() => setSuppression(true)} className="text-destructive">
                <Trash /> Supprimer définitivement
              </MenuDeroulantElement>
            )}
          </MenuDeroulantContenu>
        </MenuDeroulant>
      )}

      {annulation && <DialogueAnnulation id={id} numero={numero} onFermer={() => setAnnulation(false)} />}
      <Dialog open={suppression} onOpenChange={setSuppression}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer {numero} ?</DialogTitle>
            <DialogDescription>Réservé aux erreurs de saisie (aucun départ ni paiement). Le numéro ne sera pas réutilisé. Action irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuppression(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setSuppression(false);
                if (traiterResultat(await supprimerContrat(id))) router.push("/location/contrats");
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DialogueAnnulation({ id, numero, onFermer }: { id: string; numero: string; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaAnnulation, { motif: "" });
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler {numero} ?</DialogTitle>
          <DialogDescription>Le véhicule redevient disponible sur ces dates. Le contrat reste visible (statut « Annulée »).</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await annulerContrat(id, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <Champ label="Motif" htmlFor="motif" erreur={errors.motif?.message} obligatoire>
            <Textarea id="motif" rows={2} placeholder="Ex. : le client a annulé son voyage" {...register("motif")} />
          </Champ>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer}>
              Garder la location
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              Annuler la location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
