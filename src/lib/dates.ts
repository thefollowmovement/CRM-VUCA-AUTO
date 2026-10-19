// =====================================================================
//  Dates et heures « à la française » : les dates/heures sont stockées en
//  UTC et saisies / affichées à l'heure de Paris (heure d'été comprise).
//  Fonctions pures, utilisables côté serveur comme dans le navigateur.
// =====================================================================

const FUSEAU = "Europe/Paris";
export const MS_PAR_MINUTE = 60 * 1000;
export const MS_PAR_JOUR = 24 * 60 * MS_PAR_MINUTE;

const formateurParties = new Intl.DateTimeFormat("en-GB", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type PartiesDate = { annee: number; mois: number; jour: number; heure: number; minute: number };

/** Date UTC → année, mois (1–12), jour, heure, minute à Paris. */
export function partiesParis(date: Date): PartiesDate {
  const p = Object.fromEntries(formateurParties.formatToParts(date).map((x) => [x.type, x.value]));
  return { annee: Number(p.year), mois: Number(p.month), jour: Number(p.day), heure: Number(p.hour), minute: Number(p.minute) };
}

/** Heure de Paris → Date UTC (gère le changement d'heure). */
export function dateDepuisParis(annee: number, mois: number, jour: number, heure = 0, minute = 0): Date {
  // On part de l'heure « comme si c'était UTC », puis on corrige du décalage de Paris.
  const naif = Date.UTC(annee, mois - 1, jour, heure, minute);
  let resultat = naif;
  for (let i = 0; i < 2; i++) {
    const p = partiesParis(new Date(resultat));
    const vu = Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute);
    resultat += naif - vu;
  }
  return new Date(resultat);
}

/** « 2026-10-20T09:30 » (valeur d'un <input type="datetime-local">, heure de Paris) → Date UTC. */
export function saisieParisVersDate(saisie: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(saisie);
  if (!m) return null;
  const [annee, mois, jour, heure, minute] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31 || heure > 23 || minute > 59) return null;
  const d = dateDepuisParis(annee, mois, jour, heure, minute);
  // Refuse les dates impossibles (31 février…)
  const p = partiesParis(d);
  return p.jour === jour && p.mois === mois ? d : null;
}

const deux = (n: number) => String(n).padStart(2, "0");

/** Date UTC → « 2026-10-20T09:30 » à Paris (pour préremplir un champ). */
export function dateVersSaisieParis(date: Date | null | undefined): string {
  if (!date) return "";
  const p = partiesParis(date);
  return `${p.annee}-${deux(p.mois)}-${deux(p.jour)}T${deux(p.heure)}:${deux(p.minute)}`;
}

/** Date UTC → « 2026-10-20 » (jour à Paris). */
export function jourParisISO(date: Date): string {
  const p = partiesParis(date);
  return `${p.annee}-${deux(p.mois)}-${deux(p.jour)}`;
}

/** Ajoute n mois « date à date » à l'heure de Paris (31/01 + 1 mois = 28/02 ou 29/02). */
export function ajouterMoisParis(date: Date, n: number): Date {
  const p = partiesParis(date);
  const total = p.annee * 12 + (p.mois - 1) + n;
  const annee = Math.floor(total / 12);
  const mois = (total % 12) + 1;
  const dernierJour = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return dateDepuisParis(annee, mois, Math.min(p.jour, dernierJour), p.heure, p.minute);
}

/** Ajoute n jours calendaires à l'heure de Paris (même heure locale). */
export function ajouterJoursParis(date: Date, n: number): Date {
  const p = partiesParis(date);
  const j = new Date(Date.UTC(p.annee, p.mois - 1, p.jour + n));
  return dateDepuisParis(j.getUTCFullYear(), j.getUTCMonth() + 1, j.getUTCDate(), p.heure, p.minute);
}

/** Minuit (heure de Paris) du jour de la date. */
export function debutJourParis(date: Date): Date {
  const p = partiesParis(date);
  return dateDepuisParis(p.annee, p.mois, p.jour);
}

/** « 2026-10-20 » → minuit à Paris. */
export function jourISOVersDateParis(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return saisieParisVersDate(`${iso}T00:00`);
}
