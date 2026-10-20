"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useEffect, useState } from "react";

/**
 * Feuille du bas (mobile) / panneau centré (ordinateur), ex. filtres.
 * Rendue DANS l'élément .site pour garder les couleurs du site (et le mode sombre).
 */
export function FeuilleBas({ ouverte, onOuverteChange, titre, children, pied }: { ouverte: boolean; onOuverteChange: (o: boolean) => void; titre: string; children: React.ReactNode; pied?: React.ReactNode }) {
  const [conteneur, setConteneur] = useState<HTMLElement | null>(null);
  useEffect(() => setConteneur(document.querySelector<HTMLElement>(".site")), []);
  return (
    <D.Root open={ouverte} onOpenChange={onOuverteChange}>
      <D.Portal container={conteneur ?? undefined}>
        <D.Overlay className="site-voile fixed inset-0 z-50 bg-[var(--site-voile)]" />
        <D.Content
          className="site-feuille fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[22px] bg-site-carte text-site-texte shadow-site-fort outline-none md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[80dvh] md:w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-carte"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-site-sep md:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-3 md:pt-5">
            <D.Title className="s-titre-4">{titre}</D.Title>
            <D.Close className="s-transition inline-flex size-11 items-center justify-center rounded-full text-site-2 transition-colors hover:bg-site-fond-alt hover:text-site-texte" aria-label="Fermer">
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {pied && <div className="border-t border-site-sep px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{pied}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
