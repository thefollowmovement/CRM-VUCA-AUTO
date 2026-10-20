"use client";

import { X } from "lucide-react";

/** Puce d'un filtre actif, avec bouton pour le retirer. */
export function PuceFiltre({ libelle, onRetirer }: { libelle: string; onRetirer: () => void }) {
  return (
    <span className="inline-flex h-11 items-center rounded-full bg-site-fond-alt pl-4 text-[14px] font-medium">
      {libelle}
      <button
        type="button"
        onClick={onRetirer}
        aria-label={`Retirer le filtre ${libelle}`}
        className="s-transition inline-flex size-11 items-center justify-center rounded-full text-site-2 transition-colors hover:bg-site-sep/60 hover:text-site-texte"
      >
        <X className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </span>
  );
}
