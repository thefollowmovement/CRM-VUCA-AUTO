import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormulaireVehicule } from "@/components/vehicules/formulaire-vehicule";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { vehiculeVersSaisie } from "@/lib/vehicule-formulaire";
import { obtenirVehicule, partenairesFinancement } from "@/server/requetes/vehicules";

export const metadata: Metadata = { title: "Modifier le véhicule" };

export default async function PageModifierVehicule({ params }: { params: Promise<{ id: string }> }) {
  await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const vehicule = await obtenirVehicule(id);
  if (!vehicule) notFound();
  const partenaires = await partenairesFinancement(vehicule.participations.map((p) => p.partenaireId));
  return <FormulaireVehicule vehiculeId={id} valeurs={vehiculeVersSaisie(vehicule)} partenaires={partenaires} />;
}
