"use client";

import { Camera, LoaderCircle, Receipt, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { compresserImage } from "@/lib/compression-image";
import { envoyerFichierSinistre, refacturerFranchise, supprimerSinistre } from "@/server/actions/sinistres";

export function ActionsSinistre({ id, franchiseRefacturable, estAdmin }: { id: string; franchiseRefacturable: boolean; estAdmin: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {franchiseRefacturable && (
        <Confirmation
          titre="Refacturer la franchise ?"
          description="Le montant est ajouté aux frais supplémentaires de la location concernée."
          libelleConfirmer="Refacturer"
          destructif={false}
          onConfirmer={async () => {
            if (traiterResultat(await refacturerFranchise(id))) router.refresh();
          }}
        >
          <Button>
            <Receipt /> Refacturer la franchise
          </Button>
        </Confirmation>
      )}
      <input
        ref={champ}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="sr-only"
        aria-label="Photos ou documents du sinistre"
        onChange={async (e) => {
          const fichiers = Array.from(e.target.files ?? []);
          if (!fichiers.length) return;
          setEnvoi(true);
          let ok = true;
          for (const f of fichiers) {
            const fd = new FormData();
            fd.set("sinistreId", id);
            fd.set("document", await compresserImage(f, 2000, 0.85));
            ok = traiterResultat(await envoyerFichierSinistre(fd)) && ok;
          }
          if (ok) router.refresh();
          setEnvoi(false);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => champ.current?.click()} disabled={envoi}>
        {envoi ? <LoaderCircle className="animate-spin" /> : <Camera />} Photos / documents
      </Button>
      {estAdmin && (
        <Confirmation
          titre="Supprimer ce sinistre ?"
          description="Les photos et documents rattachés sont supprimés aussi."
          libelleConfirmer="Supprimer"
          onConfirmer={async () => {
            if (traiterResultat(await supprimerSinistre(id))) router.push("/location/sinistres");
          }}
        >
          <Button variant="ghost" className="text-destructive">
            <Trash /> Supprimer
          </Button>
        </Confirmation>
      )}
    </div>
  );
}
