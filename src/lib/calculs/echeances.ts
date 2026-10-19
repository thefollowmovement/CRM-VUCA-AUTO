// État d'une échéance (CT, assurance, vidange, révision) : dépassée, proche, à jour.

export type EtatEcheance = { niveau: "depassee" | "proche" | "ok" | "inconnue"; texte: string };

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

function jourUTC(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Échéance à une date : « proche » si elle tombe dans les `seuilJours` jours. */
export function etatEcheanceDate(date: Date | null, aujourdhui: Date, seuilJours: number): EtatEcheance {
  if (!date) return { niveau: "inconnue", texte: "Non renseignée" };
  const jours = Math.round((jourUTC(date) - jourUTC(aujourdhui)) / MS_PAR_JOUR);
  if (jours < 0) return { niveau: "depassee", texte: `Dépassée de ${-jours} jour${jours < -1 ? "s" : ""}` };
  if (jours === 0) return { niveau: "proche", texte: "Aujourd'hui" };
  if (jours <= seuilJours) return { niveau: "proche", texte: `Dans ${jours} jour${jours > 1 ? "s" : ""}` };
  return { niveau: "ok", texte: `Dans ${jours} jours` };
}

/** Échéance kilométrique : « proche » s'il reste moins de `seuilKm` km. */
export function etatEcheanceKm(kmCible: number | null, kmActuel: number | null, seuilKm: number): EtatEcheance {
  if (kmCible === null) return { niveau: "inconnue", texte: "Non renseignée" };
  if (kmActuel === null) return { niveau: "inconnue", texte: "Kilométrage actuel inconnu" };
  const reste = kmCible - kmActuel;
  const fmt = new Intl.NumberFormat("fr-FR", { useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
  if (reste < 0) return { niveau: "depassee", texte: `Dépassée de ${fmt.format(-reste)} km` };
  if (reste <= seuilKm) return { niveau: "proche", texte: `Dans ${fmt.format(reste)} km` };
  return { niveau: "ok", texte: `Dans ${fmt.format(reste)} km` };
}

/** Le plus urgent de deux états (date et km d'une même vidange, par ex.). */
export function plusUrgent(a: EtatEcheance, b: EtatEcheance): EtatEcheance {
  const rang = { depassee: 0, proche: 1, ok: 2, inconnue: 3 } as const;
  return rang[a.niveau] <= rang[b.niveau] ? a : b;
}
