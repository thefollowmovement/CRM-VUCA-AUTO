"use client";

import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { supprimerDepense } from "@/server/actions/depenses";

export function BoutonSupprimerDepense({ id, retour }: { id: string; retour: string }) {
  const router = useRouter();
  return (
    <Confirmation
      titre="Supprimer cette dépense ?"
      description="Elle sera retirée du coût de revient et de la répartition. Ses justificatifs seront effacés."
      libelleConfirmer="Supprimer"
      onConfirmer={async () => {
        if (traiterResultat(await supprimerDepense(id))) {
          router.push(retour);
          router.refresh();
        }
      }}
    >
      <Button variant="outline" className="text-destructive">
        <Trash /> Supprimer
      </Button>
    </Confirmation>
  );
}
