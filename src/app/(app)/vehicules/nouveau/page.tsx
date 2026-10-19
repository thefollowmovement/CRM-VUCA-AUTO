import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { FormulaireVehicule } from "@/components/vehicules/formulaire-vehicule";
import { valeursNouveauVehicule } from "@/lib/vehicule-formulaire";
import { aujourdhuiISO } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { partenairesFinancement } from "@/server/requetes/vehicules";

export const metadata: Metadata = { title: "Nouveau véhicule" };

export default async function PageNouveauVehicule() {
  await exigerRolePage(ROLES_GESTION);
  const partenaires = await partenairesFinancement();
  return (
    <>
      <Link href="/vehicules" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Véhicules
      </Link>
      <EnTetePage titre="Nouveau véhicule" description="Les champs marqués * sont obligatoires." />
      <FormulaireVehicule valeurs={valeursNouveauVehicule(aujourdhuiISO())} partenaires={partenaires} />
    </>
  );
}
