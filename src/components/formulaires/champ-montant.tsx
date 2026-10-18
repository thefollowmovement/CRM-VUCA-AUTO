import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Champ de saisie d'un montant en euros (clavier numérique sur téléphone). */
export function ChampMontant({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        className={cn("pr-8 text-right tabular-nums", className)}
        {...props}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        €
      </span>
    </div>
  );
}
