"use client";

import { Check, Share } from "lucide-react";
import { useState } from "react";
import { Bouton } from "./bouton";

/** Partager l'annonce : menu de partage du téléphone, sinon copie du lien. */
export function Partager({ titre, url, className }: { titre: string; url: string; className?: string }) {
  const [copie, setCopie] = useState(false);
  const partager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titre, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // partage annulé par l'utilisateur
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      window.prompt("Copiez le lien de l'annonce :", url);
    }
  };
  return (
    <Bouton variante="discret" onClick={partager} className={className} aria-live="polite">
      {copie ? <Check strokeWidth={1.75} aria-hidden /> : <Share strokeWidth={1.75} aria-hidden />}
      {copie ? "Lien copié" : "Partager"}
    </Bouton>
  );
}
