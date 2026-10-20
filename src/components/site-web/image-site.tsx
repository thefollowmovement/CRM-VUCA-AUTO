"use client";

import { ImageUp, LoaderCircle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { compresserImage } from "@/lib/compression-image";
import { cn } from "@/lib/utils";
import { envoyerImageSite, retirerImageSite } from "@/server/actions/site";
import type { ChampImageSite } from "@/server/site/reglages";

/** Envoi / remplacement / retrait d'une image du site (logo, favicon, photo…). */
export function ImageSite({
  champ,
  fichierId,
  libelle,
  aide,
  fond = "clair",
  forme = "carre",
}: {
  champ: ChampImageSite;
  fichierId: string | null;
  libelle: string;
  aide?: string;
  fond?: "clair" | "fonce";
  forme?: "carre" | "rond" | "large";
}) {
  const router = useRouter();
  const entree = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  // Les logos et le favicon gardent leur transparence : pas de recompression côté navigateur
  const transparence = champ === "logoClairId" || champ === "logoFonceId" || champ === "faviconId";

  const envoyer = async (brut: File) => {
    setEnCours(true);
    const formulaire = new FormData();
    formulaire.set("champ", champ);
    formulaire.set("image", transparence ? brut : await compresserImage(brut));
    if (traiterResultat(await envoyerImageSite(formulaire))) router.refresh();
    setEnCours(false);
    if (entree.current) entree.current.value = "";
  };

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border",
          fond === "fonce" ? "bg-neutral-900" : "bg-white",
          forme === "rond" ? "size-20 rounded-full" : forme === "large" ? "aspect-[1200/630] w-48 rounded-xl" : "size-20 rounded-xl",
        )}
      >
        {fichierId ? (
          <img src={`/api/fichiers/${fichierId}`} alt={libelle} className={forme === "carre" ? "max-h-full max-w-full object-contain p-1" : "size-full object-cover"} />
        ) : (
          <span className={cn("px-2 text-center text-xs", fond === "fonce" ? "text-neutral-400" : "text-muted-foreground")}>Aucune image</span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm font-medium">{libelle}</p>
        <input
          ref={entree}
          type="file"
          accept={transparence ? "image/png,image/jpeg,image/webp" : "image/*"}
          className="hidden"
          aria-label={libelle}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void envoyer(f);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={enCours} onClick={() => entree.current?.click()}>
            {enCours ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
            {fichierId ? "Remplacer" : "Ajouter"}
          </Button>
          {fichierId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={enCours}
              onClick={async () => {
                if (traiterResultat(await retirerImageSite(champ))) router.refresh();
              }}
            >
              <Trash /> Retirer
            </Button>
          )}
        </div>
        {aide && <p className="text-xs text-muted-foreground">{aide}</p>}
      </div>
    </div>
  );
}
