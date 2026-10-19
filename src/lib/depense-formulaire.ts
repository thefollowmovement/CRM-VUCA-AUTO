// Conversion dépense ↔ valeurs de formulaire (appelé par les pages serveur).
import { centimesVersSaisie, dateCalendaireVersISO } from "@/lib/format";
import type { SaisieDepense } from "@/lib/validations/finance";

export function valeursNouvelleDepense(aujourdhui: string, vehiculeId: string, payeParId: string): SaisieDepense {
  return {
    vehiculeId,
    date: aujourdhui,
    categorieId: "",
    libelle: "",
    montant: "",
    payeParId, // VUCA AUTO présélectionné
    payeSurRecettes: false,
    fournisseur: "",
    kilometrage: "",
    note: "",
  };
}

export function depenseVersSaisie(d: {
  vehiculeId: string;
  date: Date;
  categorieId: string;
  libelle: string;
  montantCentimes: number;
  payeParId: string;
  payeSurRecettes: boolean;
  fournisseur: string | null;
  kilometrage: number | null;
  note: string | null;
}): SaisieDepense {
  return {
    vehiculeId: d.vehiculeId,
    date: dateCalendaireVersISO(d.date),
    categorieId: d.categorieId,
    libelle: d.libelle,
    montant: centimesVersSaisie(d.montantCentimes),
    payeParId: d.payeParId,
    payeSurRecettes: d.payeSurRecettes,
    fournisseur: d.fournisseur ?? "",
    kilometrage: d.kilometrage === null ? "" : String(d.kilometrage),
    note: d.note ?? "",
  };
}

/** N'accepte qu'un chemin interne comme page de retour. */
export function retourSur(valeur: string | string[] | undefined, defaut: string): string {
  const v = Array.isArray(valeur) ? valeur[0] : valeur;
  return v && /^\/[a-z0-9/_-]*$/i.test(v) ? v : defaut;
}
