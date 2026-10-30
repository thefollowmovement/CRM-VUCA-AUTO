// =====================================================================
//  Formats français : montants, pourcentages, dates (fuseau Europe/Paris).
//  Les montants circulent TOUJOURS en centimes (entiers).
// =====================================================================

export const FUSEAU = "Europe/Paris";

// « always » : certains navigateurs n'affichent pas l'espace des milliers à 4 chiffres
// (« 1000,00 € ») ; on force « 1 000,00 € » partout, comme côté serveur.
const GROUPEMENT = { useGrouping: "always" } as unknown as Intl.NumberFormatOptions;

const formateurEuros = new Intl.NumberFormat("fr-FR", {
  ...GROUPEMENT,
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123456 → « 1 234,56 € » */
export function formatEuros(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) return "—";
  return formateurEuros.format(centimes / 100);
}

/** 123456 → « 1 234,56 » (sans symbole, pour préremplir un champ). */
export function centimesVersSaisie(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) return "";
  const signe = centimes < 0 ? "-" : "";
  const abs = Math.abs(centimes);
  const euros = Math.floor(abs / 100);
  const cts = abs % 100;
  return `${signe}${euros},${String(cts).padStart(2, "0")}`;
}

/**
 * Convertit une saisie utilisateur en centimes, sans passer par les nombres
 * à virgule (aucune erreur d'arrondi).
 * Accepte : « 1 234,56 », « 1234.56 », « 1.234,56 », « 12,5 », « 800 € ».
 * Renvoie null si la saisie est invalide.
 */
export function parseEurosEnCentimes(saisie: string): number | null {
  let s = saisie.replace(/[\s  €]/g, "");
  if (s === "") return null;
  let negatif = false;
  if (s.startsWith("-")) {
    negatif = true;
    s = s.slice(1);
  }
  // « 1.234,56 » : le point est un séparateur de milliers.
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "");
  s = s.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [entier = "0", decimales = ""] = s.split(".");
  const centimes = Number(entier) * 100 + Number(decimales.padEnd(2, "0"));
  if (!Number.isSafeInteger(centimes)) return null;
  return negatif ? -centimes : centimes;
}

/** Points de base → « 36,67 % » (100 bp = 1 %). */
export function formatPourcentageBp(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return "—";
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(bp / 100) + " %"
  );
}

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formateurDateHeure = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** → « 18/10/2026 » */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formateurDate.format(new Date(date));
}

/** → « 18/10/2026 15:42 » */
export function formatDateHeure(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formateurDateHeure.format(new Date(date)).replace(",", "");
}

/**
 * Date calendaire « AAAA-MM-JJ » (valeur d'un <input type="date">) → Date à
 * minuit UTC, format attendu par les colonnes @db.Date.
 */
export function dateCalendaireDepuisISO(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date (colonne @db.Date) → « AAAA-MM-JJ » pour préremplir un <input type="date">. */
export function dateCalendaireVersISO(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

/** « FR7630006000011234567890189 » → « FR76 •••• •••• •••• 0189 » */
export function masquerIban(iban: string | null | undefined): string {
  if (!iban) return "—";
  const propre = iban.replace(/\s/g, "").toUpperCase();
  if (propre.length < 8) return "••••";
  return `${propre.slice(0, 4)} •••• •••• •••• ${propre.slice(-4)}`;
}

/** Nombre entier avec séparateur de milliers : 125000 → « 125 000 » */
export function formatNombre(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", GROUPEMENT).format(n);
}

/** Date du jour à Paris au format « AAAA-MM-JJ » (valeur par défaut des champs date). */
export function aujourdhuiISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Points de base → « 36,67 » (sans symbole, pour préremplir un champ). */
export function bpVersSaisie(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return "";
  const entier = Math.floor(bp / 100);
  const dec = bp % 100;
  return dec === 0 ? String(entier) : `${entier},${String(dec).padStart(2, "0").replace(/0$/, "")}`;
}
