"use client";

import { Camera, LoaderCircle, Receipt, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { compresserImage } from "@/lib/compression-image";
import { changerStatutAmende, envoyerAvisAmende, refacturerAmende, supprimerAmende } from "@/server/actions/amendes";

export function ActionsAmende({ id, statut, refacturable, estAdmin }: { id: string; statut: string; refacturable: boolean; estAdmin: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {refacturable && (
        <Confirmation
          titre="Refacturer ce PV au client ?"
          description="Son montant est ajouté aux frais supplémentaires de la location."
          libelleConfirmer="Refacturer"
          destructif={false}
          onConfirmer={async () => {
            if (traiterResultat(await refacturerAmende(id))) router.refresh();
          }}
        >
          <Button>
            <Receipt /> Refacturer au client
          </Button>
        </Confirmation>
      )}
      {(statut === "A_DESIGNER" || statut === "A_VALIDER" || statut === "RECUE") && (
        <Button
          variant="outline"
          onClick={async () => {
            if (traiterResultat(await changerStatutAmende(id, "CONDUCTEUR_DESIGNE"))) router.refresh();
          }}
        >
          Conducteur désigné
        </Button>
      )}
      {["RECUE", "A_VALIDER", "A_DESIGNER", "CONDUCTEUR_DESIGNE", "CONTESTE"].includes(statut) && (
        <Button
          variant="outline"
          onClick={async () => {
            if (traiterResultat(await changerStatutAmende(id, "PAYEE"))) router.refresh();
          }}
        >
          Payé par VUCA AUTO
        </Button>
      )}
      <input
        ref={champ}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-label="Avis de contravention"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setEnvoi(true);
          const fd = new FormData();
          fd.set("amendeId", id);
          fd.set("document", await compresserImage(f, 2000, 0.88));
          if (traiterResultat(await envoyerAvisAmende(fd))) router.refresh();
          setEnvoi(false);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => champ.current?.click()} disabled={envoi}>
        {envoi ? <LoaderCircle className="animate-spin" /> : <Camera />} Ajouter l&apos;avis
      </Button>
      {estAdmin && (
        <Confirmation
          titre="Supprimer ce PV ?"
          libelleConfirmer="Supprimer"
          onConfirmer={async () => {
            if (traiterResultat(await supprimerAmende(id))) router.push("/location/amendes");
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
