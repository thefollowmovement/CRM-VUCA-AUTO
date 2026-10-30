// Alertes sur un client : liste noire, permis trop récent ou expiré, pièce d'identité expirée.

export type AlerteClient = { niveau: "bloquant" | "attention"; texte: string };

const jourUTC = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Années pleines entre deux dates calendaires. */
export function anneesPleines(depuis: Date, jusqua: Date): number {
  let ans = jusqua.getUTCFullYear() - depuis.getUTCFullYear();
  const anniversaire = Date.UTC(jusqua.getUTCFullYear(), depuis.getUTCMonth(), depuis.getUTCDate());
  if (jourUTC(jusqua) < anniversaire) ans--;
  return ans;
}

export function alertesClient(
  c: {
    listeNoire: boolean;
    motifListeNoire?: string | null;
    numeroPermis?: string | null;
    dateObtentionPermis: Date | null;
    dateValiditePermis: Date | null;
    dateValiditePieceIdentite: Date | null;
  },
  aujourdhui: Date,
  anciennetePermisMinAnnees: number,
): AlerteClient[] {
  const alertes: AlerteClient[] = [];
  if (c.listeNoire) alertes.push({ niveau: "bloquant", texte: `Liste noire${c.motifListeNoire ? ` : ${c.motifListeNoire}` : ""}` });
  if (!c.numeroPermis && !c.dateObtentionPermis) alertes.push({ niveau: "attention", texte: "Permis de conduire non renseigné" });
  if (c.dateValiditePermis && jourUTC(c.dateValiditePermis) < jourUTC(aujourdhui)) alertes.push({ niveau: "bloquant", texte: "Permis expiré" });
  if (c.dateObtentionPermis) {
    const ans = anneesPleines(c.dateObtentionPermis, aujourdhui);
    if (ans < anciennetePermisMinAnnees) {
      alertes.push({ niveau: "attention", texte: `Permis de moins de ${anciennetePermisMinAnnees} an${anciennetePermisMinAnnees > 1 ? "s" : ""} (${ans < 1 ? "moins d'un an" : `${ans} an${ans > 1 ? "s" : ""}`})` });
    }
  }
  if (c.dateValiditePieceIdentite && jourUTC(c.dateValiditePieceIdentite) < jourUTC(aujourdhui)) alertes.push({ niveau: "attention", texte: "Pièce d'identité expirée" });
  return alertes;
}
