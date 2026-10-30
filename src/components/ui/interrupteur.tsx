"use client";

import { cn } from "@/lib/utils";

/** Interrupteur accessible (rôle « switch »), zone tactile de 44 px. */
export function Interrupteur({
  actif,
  onChange,
  libelle,
  desactive,
  id,
}: {
  actif: boolean;
  onChange: (actif: boolean) => void;
  libelle: string;
  desactive?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      disabled={desactive}
      onClick={() => onChange(!actif)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={cn("relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors", actif ? "bg-success" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform", actif && "translate-x-5")} />
      </span>
    </button>
  );
}
