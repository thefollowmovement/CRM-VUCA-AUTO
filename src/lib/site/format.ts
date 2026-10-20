// Formats du site public : « 12 490 € », « 84 500 km » (sans centimes).
const entier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, useGrouping: "always" } as unknown as Intl.NumberFormatOptions);

/** 1249000 centimes → « 12 490 € » (arrondi à l'euro). */
export function prixSite(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) return "Prix sur demande";
  return `${entier.format(Math.round(centimes / 100))} €`;
}

/** 84500 → « 84 500 km » */
export function kmSite(km: number | null | undefined): string {
  return km === null || km === undefined ? "" : `${entier.format(km)} km`;
}
