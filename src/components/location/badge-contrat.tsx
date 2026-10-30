import { COULEURS_STATUT_CONTRAT, LIBELLES_STATUT_CONTRAT, type StatutAffiche } from "@/lib/contrat";
import { cn } from "@/lib/utils";

export function BadgeContrat({ statut, className }: { statut: StatutAffiche; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", COULEURS_STATUT_CONTRAT[statut].badge, className)}>
      {LIBELLES_STATUT_CONTRAT[statut]}
    </span>
  );
}
