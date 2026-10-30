import { Ban, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AlerteClient } from "@/lib/calculs/clients";
import { cn } from "@/lib/utils";

/** Badges d'alerte compacts (listes). */
export function BadgesAlertes({ alertes }: { alertes: AlerteClient[] }) {
  if (alertes.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {alertes.map((a) => (
        <Badge key={a.texte} variant={a.niveau === "bloquant" ? "destructive" : "warning"}>
          {a.niveau === "bloquant" ? <Ban className="size-3" /> : <TriangleAlert className="size-3" />}
          {a.texte.startsWith("Liste noire") ? "Liste noire" : a.texte}
        </Badge>
      ))}
    </span>
  );
}

/** Encadré d'alertes (fiche client, assistant de contrat). */
export function EncadreAlertes({ alertes, className }: { alertes: AlerteClient[]; className?: string }) {
  if (alertes.length === 0) return null;
  const bloquant = alertes.some((a) => a.niveau === "bloquant");
  return (
    <div className={cn("flex gap-2 rounded-lg border p-3 text-sm", bloquant ? "border-destructive/50 bg-destructive/10" : "border-warning/60 bg-warning/10", className)}>
      {bloquant ? <Ban className="mt-0.5 size-4 shrink-0 text-destructive" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
      <ul className="flex flex-col gap-0.5">
        {alertes.map((a) => (
          <li key={a.texte} className={cn(a.niveau === "bloquant" && "font-medium text-destructive")}>
            {a.texte}
          </li>
        ))}
      </ul>
    </div>
  );
}
