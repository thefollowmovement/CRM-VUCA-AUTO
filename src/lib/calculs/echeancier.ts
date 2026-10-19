// =====================================================================
//  Échéancier d'un contrat et imputation des paiements (section 3.6)
//
//   - Mensuelle : une échéance par mois « date à date » au tarif mensuel,
//     dernier mois entamé au prorata (÷ 30). La 1re échéance est due au
//     départ, les suivantes au premier « jour d'échéance » à partir du
//     début de leur période (ex. le 5 : période du 29/10 → due le 05/11).
//   - Courte durée : acompte (si demandé) + solde dû au départ, sinon une
//     seule échéance au départ.
//   - Options, livraison et remise sont portées par la 1re échéance pour
//     que le total tombe exactement sur le prix du contrat.
//   - Les paiements de loyer sont imputés dans l'ordre des échéances
//     (le plus ancien d'abord) : paiements partiels acceptés.
// =====================================================================
import { ajouterMoisParis, jourParisISO, partiesParis } from "@/lib/dates";
import { diviserArrondi } from "./repartition";

export type LigneEcheance = {
  numero: number;
  libelle: string;
  dateEcheance: string; // AAAA-MM-JJ (date calendaire)
  periodeDebut: string | null;
  periodeFin: string | null;
  montantCentimes: number;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const deux = (n: number) => String(n).padStart(2, "0");
const jj = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/** Veille d'une date ISO (fin de période « date à date »). */
function veille(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function genererEcheancier(c: {
  type: "JOURNALIERE" | "HEBDOMADAIRE" | "MENSUELLE";
  departPrevuLe: Date;
  retourPrevuLe: Date;
  tarifCentimes: number;
  dureeFacturee: number;
  joursSupplementaires: number;
  prixTotalCentimes: number;
  acompteCentimes: number | null;
  jourEcheanceMensuelle: number | null;
  /** Date de création (échéance de l'acompte). */
  creeLe: Date;
}): LigneEcheance[] {
  const depart = jourParisISO(c.departPrevuLe);
  const lignes: LigneEcheance[] = [];

  if (c.type !== "MENSUELLE") {
    const acompte = c.acompteCentimes ?? 0;
    if (acompte > 0 && acompte < c.prixTotalCentimes) {
      const creation = jourParisISO(c.creeLe);
      lignes.push({ numero: 1, libelle: "Acompte", dateEcheance: creation < depart ? creation : depart, periodeDebut: null, periodeFin: null, montantCentimes: acompte });
      lignes.push({ numero: 2, libelle: "Solde", dateEcheance: depart, periodeDebut: null, periodeFin: null, montantCentimes: c.prixTotalCentimes - acompte });
    } else {
      lignes.push({ numero: 1, libelle: "Location", dateEcheance: depart, periodeDebut: null, periodeFin: null, montantCentimes: c.prixTotalCentimes });
    }
    return lignes;
  }

  const jour = Math.min(28, Math.max(1, c.jourEcheanceMensuelle ?? 1));
  const nb = c.dureeFacturee + (c.joursSupplementaires > 0 ? 1 : 0);
  for (let i = 0; i < Math.max(nb, 1); i++) {
    const debut = ajouterMoisParis(c.departPrevuLe, i);
    const dernierPartiel = i === c.dureeFacturee && c.joursSupplementaires > 0;
    const fin = dernierPartiel || i === nb - 1 ? c.retourPrevuLe : ajouterMoisParis(c.departPrevuLe, i + 1);
    const p = partiesParis(debut);
    const isoDebut = jourParisISO(debut);
    const isoFin = veille(jourParisISO(fin));
    let date = depart;
    if (i > 0) {
      // Premier « jour d'échéance » ≥ début de période (mois suivant si le jour est passé)
      const [a, m] = p.jour <= jour ? [p.annee, p.mois] : p.mois === 12 ? [p.annee + 1, 1] : [p.annee, p.mois + 1];
      date = `${a}-${deux(m)}-${deux(jour)}`;
    }
    lignes.push({
      numero: i + 1,
      libelle: `${dernierPartiel ? "Loyer au prorata" : "Loyer"} ${MOIS[p.mois - 1]} ${p.annee} (du ${jj(isoDebut)} au ${jj(isoFin)})`,
      dateEcheance: date,
      periodeDebut: isoDebut,
      periodeFin: isoFin,
      montantCentimes: dernierPartiel ? diviserArrondi(c.tarifCentimes * c.joursSupplementaires, 30) : c.tarifCentimes,
    });
  }
  // Options, livraison, remise : sur la 1re échéance (le total tombe juste)
  const ecart = c.prixTotalCentimes - lignes.reduce((a, l) => a + l.montantCentimes, 0);
  lignes[0]!.montantCentimes += ecart;
  return lignes;
}

export type StatutEcheance = "A_VENIR" | "PARTIELLE" | "PAYEE";
export type Imputation = {
  echeances: { id: string; payeCentimes: number; statut: StatutEcheance }[];
  /** Échéance principalement réglée par chaque paiement (null si trop-perçu). */
  paiements: { id: string; echeanceId: string | null }[];
  tropPercuCentimes: number;
};

/** Impute les paiements (dans l'ordre chronologique) sur les échéances (dans l'ordre). */
export function imputerPaiements(echeances: { id: string; montantCentimes: number }[], paiements: { id: string; montantCentimes: number }[]): Imputation {
  const paye = echeances.map(() => 0);
  const affectations: { id: string; echeanceId: string | null }[] = [];
  let i = 0;
  let surplus = 0;
  for (const p of paiements) {
    let reste = p.montantCentimes;
    let premiere: string | null = null;
    while (reste > 0 && i < echeances.length) {
      const du = echeances[i]!.montantCentimes - paye[i]!;
      if (du <= 0) {
        i++;
        continue;
      }
      const part = Math.min(du, reste);
      paye[i]! += part;
      reste -= part;
      premiere ??= echeances[i]!.id;
      if (paye[i]! >= echeances[i]!.montantCentimes) i++;
    }
    surplus += reste;
    affectations.push({ id: p.id, echeanceId: premiere });
  }
  return {
    echeances: echeances.map((e, k) => ({ id: e.id, payeCentimes: paye[k]!, statut: paye[k]! >= e.montantCentimes ? "PAYEE" : paye[k]! > 0 ? "PARTIELLE" : "A_VENIR" })),
    paiements: affectations,
    tropPercuCentimes: surplus,
  };
}

/** Jours de retard d'une échéance non soldée (0 si à jour ou pas encore due). */
export function joursRetardEcheance(dateEcheance: string, statut: StatutEcheance | "ANNULEE", aujourdhui: string): number {
  if (statut === "PAYEE" || statut === "ANNULEE" || dateEcheance >= aujourdhui) return 0;
  return Math.round((Date.parse(`${aujourdhui}T00:00:00Z`) - Date.parse(`${dateEcheance}T00:00:00Z`)) / 86_400_000);
}
