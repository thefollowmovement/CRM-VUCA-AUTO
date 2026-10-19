"use client";

import { FileText, LoaderCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Document PDF : ouverture dans un nouvel onglet, et bouton « Partager » du téléphone
 * (e-mail, WhatsApp, SMS…) — téléchargement si le partage n'est pas disponible.
 */
export function BoutonPdf({ url, libelle, nomFichier, compact }: { url: string; libelle: string; nomFichier: string; compact?: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const partager = async () => {
    setEnCours(true);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const fichier = new File([blob], nomFichier, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: libelle });
      } else {
        const lien = document.createElement("a");
        lien.href = URL.createObjectURL(blob);
        lien.download = nomFichier;
        lien.click();
        URL.revokeObjectURL(lien.href);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("Le document n'a pas pu être partagé.");
    }
    setEnCours(false);
  };
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" asChild className={compact ? "" : "flex-1 justify-start"}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <FileText /> {libelle}
        </a>
      </Button>
      <Button variant="ghost" size="icon" className="size-8" onClick={partager} disabled={enCours} aria-label={`Partager ${libelle}`}>
        {enCours ? <LoaderCircle className="animate-spin" /> : <Share2 />}
      </Button>
    </div>
  );
}
