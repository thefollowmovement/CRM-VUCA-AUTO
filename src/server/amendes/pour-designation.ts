// PV « à désigner » au format ANTAI : export CSV de secours (A2) et API de l'extension Chrome (A3).
import { societeAntai, versAmendeAntai, type AmendeAntai, type SocieteAntai } from "@/lib/amendes-antai";
import { db } from "@/lib/db";
import { lireReglages } from "@/lib/reglages";

/** Triés par date limite de désignation croissante, puis par client. */
export async function amendesPourDesignation(): Promise<{ societe: SocieteAntai; amendes: AmendeAntai[] }> {
  const [reglages, lignes] = await Promise.all([
    lireReglages(),
    db.amende.findMany({
      where: { statut: "A_DESIGNER" },
      orderBy: [{ dateLimite: { sort: "asc", nulls: "last" } }, { client: { nom: "asc" } }, { client: { prenom: "asc" } }, { creeLe: "asc" }],
      take: 1000,
      select: {
        id: true, numeroAvis: true, typeAvis: true, dateAvis: true, infractionLe: true, heureInconnue: true, immatriculationLue: true, nature: true, montantCentimes: true, dateLimite: true,
        vehicule: { select: { immatriculation: true } },
        contrat: { select: { id: true, numero: true } },
        client: {
          select: {
            civilite: true, nom: true, prenom: true, dateNaissance: true, lieuNaissance: true, paysNaissance: true, adresse: true, adresseComplement: true,
            codePostal: true, ville: true, pays: true, numeroPermis: true, dateDelivrancePermis: true, dateObtentionPermis: true, paysDelivrancePermis: true, email: true,
          },
        },
      },
    }),
  ]);
  return { societe: societeAntai(reglages), amendes: lignes.map(versAmendeAntai) };
}
