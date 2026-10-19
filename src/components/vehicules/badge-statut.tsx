import type { StatutVehicule } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { COULEURS_STATUT, LIBELLES_STATUT } from "@/lib/vehicule";

export function BadgeStatut({ statut, className }: { statut: StatutVehicule; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        COULEURS_STATUT[statut],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LIBELLES_STATUT[statut]}
    </span>
  );
}
