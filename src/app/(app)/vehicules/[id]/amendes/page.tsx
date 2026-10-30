import type { Metadata } from "next";
import { AmendesFiche } from "@/components/amendes/amendes-fiche";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Amendes du véhicule" };

/** Onglet « Amendes » de la fiche véhicule (droits vérifiés par le layout du véhicule). */
export default async function PageAmendesVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const amendes = await db.amende.findMany({
    where: { vehiculeId: id },
    orderBy: { creeLe: "desc" },
    take: 200,
    select: {
      id: true, numeroAvis: true, infractionLe: true, heureInconnue: true, montantCentimes: true, statut: true, dateLimite: true,
      contrat: { select: { numero: true } },
      client: { select: { nom: true, prenom: true } },
    },
  });
  return <AmendesFiche amendes={amendes} lienListe={`/location/amendes?vehicule=${id}`} vide="Aucun PV pour ce véhicule." />;
}
