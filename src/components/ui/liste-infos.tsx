import * as React from "react";
import { cn } from "@/lib/utils";

/** Liste « libellé : valeur » ; les valeurs vides sont masquées. */
export function ListeInfos({
  elements,
  className,
}: {
  elements: { libelle: string; valeur: React.ReactNode | null | undefined }[];
  className?: string;
}) {
  const visibles = elements.filter((e) => e.valeur !== null && e.valeur !== undefined && e.valeur !== "");
  if (visibles.length === 0) return <p className="text-sm text-muted-foreground">Non renseigné.</p>;
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3", className)}>
      {visibles.map((e) => (
        <div key={e.libelle} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{e.libelle}</dt>
          <dd className="break-words font-medium">{e.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
