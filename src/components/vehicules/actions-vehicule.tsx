"use client";

import { Archive, ArchiveRestore, BadgeEuro, Ellipsis, LoaderCircle, Pencil, RefreshCw, Trash, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MenuDeroulant,
  MenuDeroulantContenu,
  MenuDeroulantDeclencheur,
  MenuDeroulantElement,
} from "@/components/ui/menu-deroulant";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import type { StatutVehicule } from "@/generated/prisma/enums";
import { LIBELLES_STATUT, STATUTS_MANUELS } from "@/lib/vehicule";
import { schemaChangementStatut } from "@/lib/validations/vehicule";
import { annulerVente, archiverVehicule, changerStatutVehicule, restaurerVehicule, supprimerVehicule } from "@/server/actions/vehicules";

export function ActionsVehicule({
  id,
  nom,
  statut,
  estAdmin,
}: {
  id: string;
  nom: string;
  statut: StatutVehicule;
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [dialogueStatut, setDialogueStatut] = useState(false);
  const [confirmerArchive, setConfirmerArchive] = useState(false);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(false);
  const archive = statut === "ARCHIVE";
  const statutModifiable = statut !== "VENDU" && !archive;

  return (
    <div className="flex flex-wrap gap-2">
      {!archive && (
        <Button variant="outline" asChild>
          <Link href={`/vehicules/${id}/modifier`}>
            <Pencil /> Modifier
          </Link>
        </Button>
      )}
      {statutModifiable && (
        <Button asChild>
          <Link href={`/vehicules/${id}/vendre`}>
            <BadgeEuro /> Marquer comme vendu
          </Link>
        </Button>
      )}
      {statutModifiable && (
        <Button variant="outline" onClick={() => setDialogueStatut(true)}>
          <RefreshCw /> Changer le statut
        </Button>
      )}
      {archive && (
        <Button
          variant="outline"
          onClick={async () => {
            if (traiterResultat(await restaurerVehicule(id))) router.refresh();
          }}
        >
          <ArchiveRestore /> Restaurer
        </Button>
      )}

      <MenuDeroulant>
        <MenuDeroulantDeclencheur asChild>
          <Button variant="ghost" size="icon" aria-label="Plus d'actions">
            <Ellipsis />
          </Button>
        </MenuDeroulantDeclencheur>
        <MenuDeroulantContenu align="end">
          {statut === "VENDU" && (
            <MenuDeroulantElement onSelect={() => setConfirmerAnnulation(true)}>
              <Undo2 /> Annuler la vente
            </MenuDeroulantElement>
          )}
          {!archive && (
            <MenuDeroulantElement onSelect={() => setConfirmerArchive(true)}>
              <Archive /> Archiver
            </MenuDeroulantElement>
          )}
          {estAdmin && (
            <MenuDeroulantElement onSelect={() => setConfirmerSuppression(true)} className="text-destructive">
              <Trash /> Supprimer définitivement
            </MenuDeroulantElement>
          )}
        </MenuDeroulantContenu>
      </MenuDeroulant>

      {/* Confirmation d'archivage (hors du menu pour rester ouverte) */}
      <Dialog open={confirmerArchive} onOpenChange={setConfirmerArchive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver {nom} ?</DialogTitle>
            <DialogDescription>
              Il disparaît des listes « en stock » mais tout son historique est conservé. Vous pourrez le restaurer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmerArchive(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setConfirmerArchive(false);
                if (traiterResultat(await archiverVehicule(id))) router.refresh();
              }}
            >
              Archiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmerAnnulation} onOpenChange={setConfirmerAnnulation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la vente de {nom} ?</DialogTitle>
            <DialogDescription>
              À utiliser si la vente a été saisie par erreur : le prix, la date et l&apos;acheteur sont effacés et le véhicule
              retrouve son statut précédent. L&apos;opération est tracée dans l&apos;historique.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmerAnnulation(false)}>
              Garder la vente
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setConfirmerAnnulation(false);
                if (traiterResultat(await annulerVente(id))) router.refresh();
              }}
            >
              Annuler la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmerSuppression} onOpenChange={setConfirmerSuppression}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement {nom} ?</DialogTitle>
            <DialogDescription>
              Réservé aux erreurs de saisie : impossible si le véhicule a des dépenses, contrats ou mouvements.
              Photos, documents et financement seront effacés. Action irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmerSuppression(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setConfirmerSuppression(false);
                if (traiterResultat(await supprimerVehicule(id))) router.push("/vehicules");
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialogueStatut && (
        <DialogueStatut id={id} statut={statut} onFermer={() => setDialogueStatut(false)} />
      )}
    </div>
  );
}

function DialogueStatut({ id, statut, onFermer }: { id: string; statut: StatutVehicule; onFermer: () => void }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaChangementStatut, {
    statut: (STATUTS_MANUELS.includes(statut) ? statut : "EN_PREPARATION") as "EN_PREPARATION",
    motif: "",
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le statut</DialogTitle>
          <DialogDescription>
            Statut actuel : {LIBELLES_STATUT[statut]}. « Vendu » se fait avec le bouton « Marquer comme vendu » et
            « En location » automatiquement avec les contrats (Phase 4).
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await changerStatutVehicule(id, getValues()), setError)) {
              onFermer();
              router.refresh();
            }
          })}
          className="flex flex-col gap-4"
        >
          <Champ label="Nouveau statut" htmlFor="statut" erreur={errors.statut?.message}>
            <SelectNatif id="statut" {...register("statut")}>
              {STATUTS_MANUELS.map((s) => (
                <option key={s} value={s}>
                  {LIBELLES_STATUT[s]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Motif (facultatif)" htmlFor="motif" erreur={errors.motif?.message}>
            <Textarea id="motif" rows={2} placeholder="Ex. : au garage pour embrayage" {...register("motif")} />
          </Champ>
          <DialogFooter>
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
