"use client";

import { ImageUp, LoaderCircle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { envoyerLogo, retirerLogo } from "@/server/actions/reglages";

export function CarteLogo({ logoId }: { logoId: string | null }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (fichier: File) => {
    setEnCours(true);
    const formulaire = new FormData();
    formulaire.set("logo", fichier);
    if (traiterResultat(await envoyerLogo(formulaire))) router.refresh();
    setEnCours(false);
    if (champ.current) champ.current.value = "";
  };

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="flex size-28 items-center justify-center overflow-hidden rounded-xl border bg-white">
        {logoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/fichiers/${logoId}`} alt="Logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Aucun logo</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={champ}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            if (fichier) void envoyer(fichier);
          }}
        />
        <Button type="button" variant="outline" disabled={enCours} onClick={() => champ.current?.click()}>
          {enCours ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
          {logoId ? "Remplacer le logo" : "Ajouter un logo"}
        </Button>
        {logoId && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={async () => {
              if (traiterResultat(await retirerLogo())) router.refresh();
            }}
          >
            <Trash /> Retirer
          </Button>
        )}
        <p className="text-xs text-muted-foreground">PNG, JPEG ou WebP. Utilisé sur les contrats, factures et relevés.</p>
      </div>
    </div>
  );
}
