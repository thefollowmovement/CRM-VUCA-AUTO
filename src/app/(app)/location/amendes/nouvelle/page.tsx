import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireAmende } from "@/components/incidents/formulaire-amende";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { aujourdhuiISO } from "@/lib/format";
import { vehiculesPourIncidents } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "Nouveau PV" };

export default async function PageNouvelleAmende({ searchParams }: { searchParams: Promise<{ vehicule?: string }> }) {
  const sp = await searchParams;
  const vehicules = await vehiculesPourIncidents();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/location/amendes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> PV
      </Link>
      <EnTetePage titre="Nouveau PV" />
      <FormulaireAmende
        vehicules={vehicules}
        valeurs={{
          vehiculeId: vehicules.some((v) => v.id === sp.vehicule) ? sp.vehicule! : "",
          infractionLe: "",
          lieu: "",
          montant: "",
          numeroAvis: "",
          dateReception: aujourdhuiISO(),
          dateLimite: "",
          statut: "RECUE",
          note: "",
        }}
      />
    </div>
  );
}
