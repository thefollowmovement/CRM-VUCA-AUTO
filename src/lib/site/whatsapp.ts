// Numéro WhatsApp et lien wa.me avec message pré-rempli.

/** « +33 6 12 34 56 78 » ou « 06 12 34 56 78 » → « +33612345678 » (null si impossible). */
export function normaliserNumero(saisie: string | null | undefined): string | null {
  let n = (saisie ?? "").replace(/[\s.\-()]/g, "");
  if (!n) return null;
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(n)) n = `+33${n.slice(1)}`; // numéro français saisi sans indicatif
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

/** Affichage lisible : « +33 6 12 34 56 78 » (France), sinon groupes de 3. */
export function afficherNumero(numero: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(numero);
  if (m) return `+33 ${m.slice(1).join(" ")}`;
  return numero.replace(/^(\+\d{2,3})(\d+)$/, (_t, ind: string, reste: string) => `${ind} ${reste.replace(/(\d{3})(?=\d)/g, "$1 ")}`);
}

export const VARIABLES_MESSAGE = ["marque", "modele", "version", "annee", "km", "prix", "lien"] as const;
export type VariablesMessage = Partial<Record<(typeof VARIABLES_MESSAGE)[number], string | number | null>>;

/** Remplace {marque} {modele} {version} {annee} {km} {prix} {lien} ; une variable vide disparaît proprement. */
export function remplirMessage(modele: string, variables: VariablesMessage): string {
  return modele
    .replace(/\{(\w+)\}/g, (tout, nom: string) => ((VARIABLES_MESSAGE as readonly string[]).includes(nom) ? String(variables[nom as keyof VariablesMessage] ?? "") : tout))
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.)])/g, "$1") // (on garde l'espace français avant « ? » et « ! »)
    .trim();
}

/** https://wa.me/33612345678?text=… (null si le numéro est invalide). */
export function lienWhatsApp(numero: string | null | undefined, message: string): string | null {
  const n = normaliserNumero(numero);
  if (!n) return null;
  return `https://wa.me/${n.slice(1)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
