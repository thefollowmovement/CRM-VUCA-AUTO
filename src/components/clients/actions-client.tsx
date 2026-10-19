"use client";

import { Archive, ArchiveRestore, Download, Ellipsis, Eraser, KeyRound, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MenuDeroulant, MenuDeroulantContenu, MenuDeroulantDeclencheur, MenuDeroulantElement } from "@/components/ui/menu-deroulant";
import { anonymiserClient, archiverClient, restaurerClient, supprimerClient } from "@/server/actions/clients";

type Confirmer = null | "archiver" | "anonymiser" | "supprimer";

export function ActionsClient({
  id,
  nom,
  archive,
  anonymise,
  listeNoire,
  estAdmin,
}: {
  id: string;
  nom: string;
  archive: boolean;
  anonymise: boolean;
  listeNoire: boolean;
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState<Confirmer>(null);
  const textes: Record<Exclude<Confirmer, null>, { titre: string; description: string; bouton: string }> = {
    archiver: { titre: `Archiver ${nom} ?`, description: "Le client n'apparaît plus dans les listes ; son historique est conservé. Vous pourrez le restaurer.", bouton: "Archiver" },
    anonymiser: {
      titre: `Anonymiser ${nom} ?`,
      description:
        "Droit à l'effacement (RGPD) : nom, coordonnées, permis, pièce d'identité et documents sont définitivement effacés. Les contrats et montants restent, au nom de « Client anonymisé ». Pensez à exporter ses données avant si besoin. Action irréversible.",
      bouton: "Anonymiser",
    },
    supprimer: { titre: `Supprimer ${nom} ?`, description: "Réservé aux erreurs de saisie : impossible si le client a déjà loué. Action irréversible.", bouton: "Supprimer" },
  };
  const executer = async () => {
    const action = confirmer;
    setConfirmer(null);
    if (action === "archiver" && traiterResultat(await archiverClient(id))) router.refresh();
    if (action === "anonymiser" && traiterResultat(await anonymiserClient(id))) router.refresh();
    if (action === "supprimer" && traiterResultat(await supprimerClient(id))) router.push("/clients");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!archive && !anonymise && !listeNoire && (
        <Button asChild>
          <Link href={`/location/contrats/nouveau?client=${id}`}>
            <KeyRound /> Nouvelle location
          </Link>
        </Button>
      )}
      {!anonymise && (
        <Button variant="outline" asChild>
          <Link href={`/clients/${id}/modifier`}>
            <Pencil /> Modifier
          </Link>
        </Button>
      )}
      {archive && !anonymise && (
        <Button
          variant="outline"
          onClick={async () => {
            if (traiterResultat(await restaurerClient(id))) router.refresh();
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
          <MenuDeroulantElement asChild>
            <a href={`/api/export/clients/${id}`}>
              <Download /> Exporter ses données (RGPD)
            </a>
          </MenuDeroulantElement>
          {!archive && (
            <MenuDeroulantElement onSelect={() => setConfirmer("archiver")}>
              <Archive /> Archiver
            </MenuDeroulantElement>
          )}
          {estAdmin && !anonymise && (
            <MenuDeroulantElement onSelect={() => setConfirmer("anonymiser")} className="text-destructive">
              <Eraser /> Anonymiser (RGPD)
            </MenuDeroulantElement>
          )}
          {estAdmin && (
            <MenuDeroulantElement onSelect={() => setConfirmer("supprimer")} className="text-destructive">
              <Trash /> Supprimer définitivement
            </MenuDeroulantElement>
          )}
        </MenuDeroulantContenu>
      </MenuDeroulant>

      <Dialog open={confirmer !== null} onOpenChange={(o) => !o && setConfirmer(null)}>
        {confirmer && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{textes[confirmer].titre}</DialogTitle>
              <DialogDescription>{textes[confirmer].description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmer(null)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={executer}>
                {textes[confirmer].bouton}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
