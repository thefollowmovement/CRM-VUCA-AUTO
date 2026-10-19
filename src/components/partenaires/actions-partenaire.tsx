"use client";

import { Archive, ArchiveRestore, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { changerActivitePartenaire, supprimerPartenaire } from "@/server/actions/partenaires";

export function ActionsPartenaire({
  id,
  nom,
  actif,
  estSysteme,
  peutSupprimer,
}: {
  id: string;
  nom: string;
  actif: boolean;
  estSysteme: boolean;
  peutSupprimer: boolean;
}) {
  const router = useRouter();
  if (estSysteme) return null;

  return (
    <>
      {actif ? (
        <Confirmation
          titre={`Archiver ${nom} ?`}
          description="Il n'apparaîtra plus dans les listes de choix. Son historique est conservé et vous pourrez le réactiver."
          libelleConfirmer="Archiver"
          onConfirmer={async () => {
            if (traiterResultat(await changerActivitePartenaire(id, false))) router.refresh();
          }}
        >
          <Button variant="outline">
            <Archive /> Archiver
          </Button>
        </Confirmation>
      ) : (
        <Button
          variant="outline"
          onClick={async () => {
            if (traiterResultat(await changerActivitePartenaire(id, true))) router.refresh();
          }}
        >
          <ArchiveRestore /> Réactiver
        </Button>
      )}
      {peutSupprimer && (
        <Confirmation
          titre={`Supprimer définitivement ${nom} ?`}
          description="Possible uniquement s'il n'a jamais financé de véhicule ni payé de dépense. Cette action est irréversible."
          libelleConfirmer="Supprimer"
          onConfirmer={async () => {
            if (traiterResultat(await supprimerPartenaire(id))) router.push("/investisseurs");
          }}
        >
          <Button variant="ghost" className="text-destructive">
            <Trash /> Supprimer
          </Button>
        </Confirmation>
      )}
    </>
  );
}
