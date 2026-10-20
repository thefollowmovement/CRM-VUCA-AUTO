// Conversion annonce (base) → valeurs du formulaire de l'onglet « Annonce ».
// Appelée par la page serveur (jamais dans un fichier « use client »).
import { normaliserEquipements } from "@/lib/site/equipements";
import { centimesVersSaisie, dateCalendaireVersISO } from "@/lib/format";
import type { SaisieAnnonce } from "@/lib/validations/site";

type AnnonceBase = {
  titre: string; prixAfficheCentimes: number | null; prixNegociable: boolean; puissanceCh: number | null; description: string | null; equipements: unknown;
  ctAJour: boolean; ctDate: Date | null; carnetEntretien: boolean; rapportHistovec: boolean; nombreProprietaires: number | null; premiereMain: boolean;
  garantieMois: number | null; garantieTexte: string | null; nonFumeur: boolean; reviseAvantVente: boolean; travauxRealises: string | null;
  kilometrageVerifie: boolean; sourceKilometrage: string | null;
};

const n = (x: number | null) => (x === null ? "" : String(x));

export function annonceVersSaisie(a: AnnonceBase): SaisieAnnonce {
  return {
    titre: a.titre,
    prixAffiche: centimesVersSaisie(a.prixAfficheCentimes),
    prixNegociable: a.prixNegociable,
    puissanceCh: n(a.puissanceCh),
    description: a.description ?? "",
    equipements: normaliserEquipements(a.equipements),
    ctAJour: a.ctAJour,
    ctDate: dateCalendaireVersISO(a.ctDate),
    carnetEntretien: a.carnetEntretien,
    rapportHistovec: a.rapportHistovec,
    nombreProprietaires: n(a.nombreProprietaires),
    premiereMain: a.premiereMain,
    garantie: a.garantieMois !== null,
    garantieMois: n(a.garantieMois),
    garantieTexte: a.garantieTexte ?? "",
    nonFumeur: a.nonFumeur,
    reviseAvantVente: a.reviseAvantVente,
    travauxRealises: a.travauxRealises ?? "",
    kilometrageVerifie: a.kilometrageVerifie,
    sourceKilometrage: a.sourceKilometrage ?? "",
  };
}
