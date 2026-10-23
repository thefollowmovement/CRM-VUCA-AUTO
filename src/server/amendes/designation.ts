// =====================================================================
//  Désignation du conducteur d'un PV (statut « conducteur désigné »),
//  avec les frais de gestion réglés dans Réglages › Amendes.
//  Utilisée par la fiche du PV (action manuelle) et, en A3, par l'API
//  de l'extension Chrome (POST /api/antai/amendes/{id}/designee).
// =====================================================================
import type { Prisma } from "@/generated/prisma/client";
import { formatEuros } from "@/lib/format";
import { journaliser } from "@/lib/journal";

type Tx = Prisma.TransactionClient;

/** Statuts depuis lesquels on peut marquer « désigné » à la main (l'API, elle, n'accepte que « à désigner »). */
export const STATUTS_DESIGNABLES = ["A_DESIGNER", "A_VALIDER", "RECUE", "CONTESTE"] as const;

export class ErreurDesignation extends Error {
  constructor(
    message: string,
    public code: "introuvable" | "statut",
  ) {
    super(message);
  }
}

/**
 * Passe le PV en « conducteur désigné » à la date donnée.
 * Frais de gestion (si le montant réglé est > 0, une seule fois par PV) : montant noté sur le PV
 * et, si le PV est rattaché à une location, ligne « Frais de gestion avis de contravention n° … »
 * ajoutée aux frais du contrat (elle entre dans le reste à payer du client).
 */
export async function designerAmende(
  tx: Tx,
  params: { id: string; date: Date; utilisateurId: string | null; statutsAutorises?: readonly string[] },
): Promise<{ fraisCentimes: number; contratId: string | null; clientId: string | null }> {
  const a = await tx.amende.findUnique({ where: { id: params.id }, include: { frais: { where: { type: "FRAIS_GESTION_AMENDE" }, select: { id: true } } } });
  if (!a) throw new ErreurDesignation("PV introuvable.", "introuvable");
  const autorises = params.statutsAutorises ?? STATUTS_DESIGNABLES;
  if (!autorises.includes(a.statut)) throw new ErreurDesignation("Ce PV n'est pas « à désigner ».", "statut");

  const reglages = await tx.reglages.findUnique({ where: { id: 1 }, select: { amendesFraisGestionCentimes: true } });
  const montant = reglages?.amendesFraisGestionCentimes ?? 0;
  const appliquerFrais = montant > 0 && a.fraisGestionCentimes == null && a.frais.length === 0;

  if (appliquerFrais && a.contratId) {
    await tx.fraisSupplementaire.create({
      data: {
        contratId: a.contratId,
        type: "FRAIS_GESTION_AMENDE",
        libelle: `Frais de gestion avis de contravention${a.numeroAvis ? ` n° ${a.numeroAvis}` : ""}`,
        quantite: 1,
        prixUnitaireCentimes: montant,
        montantCentimes: montant,
        amendeId: a.id,
      },
    });
  }
  await tx.amende.update({
    where: { id: a.id },
    data: { statut: "CONDUCTEUR_DESIGNE", dateDesignation: params.date, ...(appliquerFrais ? { fraisGestionCentimes: montant } : {}) },
  });
  await journaliser(
    {
      utilisateurId: params.utilisateurId,
      action: "MODIFICATION",
      entite: "Amende",
      entiteId: a.id,
      avant: { statut: a.statut },
      apres: { statut: "CONDUCTEUR_DESIGNE", dateDesignation: params.date, ...(appliquerFrais ? { fraisGestion: formatEuros(montant), contratId: a.contratId } : {}) },
    },
    tx,
  );
  return { fraisCentimes: appliquerFrais ? montant : 0, contratId: a.contratId, clientId: a.clientId };
}
