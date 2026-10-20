"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Contrôle segmenté (ex. tri) : groupe de boutons radio accessibles.
 * Flèches gauche / droite pour changer, comme un groupe radio natif.
 */
export function ControleSegmente<T extends string>({ options, valeur, onChange, libelle, className }: { options: { valeur: T; libelle: string }[]; valeur: T; onChange: (v: T) => void; libelle: string; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const choisir = (i: number) => {
    const o = options[(i + options.length) % options.length]!;
    onChange(o.valeur);
    refs.current[(i + options.length) % options.length]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={libelle} className={cn("inline-flex max-w-full overflow-x-auto rounded-full bg-site-fond-alt p-1", className)}>
      {options.map((o, i) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={o.valeur}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={actif}
            tabIndex={actif ? 0 : -1}
            onClick={() => onChange(o.valeur)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                choisir(i + 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                choisir(i - 1);
              }
            }}
            className={cn(
              "s-transition min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition-[background-color,color,box-shadow]",
              actif ? "bg-site-carte text-site-texte shadow-site" : "text-site-2 hover:text-site-texte",
            )}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
