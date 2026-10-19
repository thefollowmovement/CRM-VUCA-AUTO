import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Affichage soigné quand une liste est vide. */
export function EtatVide({
  icone: Icone,
  titre,
  description,
  action,
  className,
}: {
  icone: LucideIcon;
  titre: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
        <Icone className="size-6" />
      </div>
      <h3 className="font-semibold">{titre}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
