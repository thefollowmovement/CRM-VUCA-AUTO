import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireSinistre } from "@/components/incidents/formulaire-sinistre";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { vehiculesPourIncidents } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "Déclarer un sinistre" };

export default async function PageNouveauSinistre({ searchParams }: { searchParams: Promise<{ vehicule?: string }> }) {
  const sp = await searchParams;
  const vehicules = await vehiculesPourIncidents();
  const vehiculeId = vehicules.some((v) => v.id === sp.vehicule) ? sp.vehicule! : "";
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={vehiculeId ? `/vehicules/${vehiculeId}/dommages` : "/location/sinistres"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <EnTetePage titre="Déclarer un sinistre" />
      <FormulaireSinistre
        vehicules={vehicules}
        valeurs={{
          vehiculeId,
          contratId: "",
          survenuLe: "",
          lieu: "",
          description: "",
          coutEstime: "",
          franchiseRefacturee: "",
          declareAssurance: false,
          numeroDossierAssurance: "",
          indemniteAssurance: "",
          statut: "DECLARE",
          note: "",
        }}
      />
    </div>
  );
}
