// Statuts des contrats de location : libellés, couleurs, statut calculé « En retard ».
import type { StatutContrat } from "@/generated/prisma/enums";

export type StatutAffiche = StatutContrat | "EN_RETARD";

export const LIBELLES_STATUT_CONTRAT: Record<StatutAffiche, string> = {
  RESERVATION: "Réservation",
  CONFIRMEE: "Confirmée",
  EN_COURS: "En cours",
  EN_RETARD: "En retard",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

/** Classes Tailwind (badge + barre du planning). */
export const COULEURS_STATUT_CONTRAT: Record<StatutAffiche, { badge: string; barre: string }> = {
  RESERVATION: { badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300", barre: "bg-amber-400 text-amber-950" },
  CONFIRMEE: { badge: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300", barre: "bg-blue-500 text-white" },
  EN_COURS: { badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300", barre: "bg-emerald-500 text-white" },
  EN_RETARD: { badge: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300", barre: "bg-red-500 text-white" },
  TERMINEE: { badge: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300", barre: "bg-slate-400 text-white" },
  ANNULEE: { badge: "bg-slate-100 text-slate-500 line-through dark:bg-slate-500/10", barre: "bg-slate-200 text-slate-500" },
};

/** Statuts qui bloquent le véhicule (anti-chevauchement). */
export const STATUTS_ACTIFS: StatutContrat[] = ["RESERVATION", "CONFIRMEE", "EN_COURS"];

/** « En retard » n'est pas stocké : EN_COURS + retour prévu dépassé. */
export function statutAffiche(statut: StatutContrat, retourPrevuLe: Date, maintenant = new Date()): StatutAffiche {
  return statut === "EN_COURS" && retourPrevuLe.getTime() < maintenant.getTime() ? "EN_RETARD" : statut;
}

/** Statuts de véhicule qui interdisent la location. */
export const STATUTS_VEHICULE_NON_LOUABLES = ["VENDU", "ARCHIVE", "IMMOBILISE"] as const;
