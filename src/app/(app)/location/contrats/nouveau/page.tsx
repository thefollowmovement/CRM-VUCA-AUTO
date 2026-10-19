import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AssistantContrat } from "@/components/location/assistant-contrat";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { valeursNouveauContrat } from "@/lib/contrat-formulaire";
import { db } from "@/lib/db";
import { lireReglages } from "@/lib/reglages";
import { clientsPourContrat } from "@/server/requetes/clients";
import { vehiculesLouables } from "@/server/requetes/contrats";

export const metadata: Metadata = { title: "Nouvelle location" };

export default async function PageNouveauContrat({ searchParams }: { searchParams: Promise<{ client?: string; vehicule?: string; jour?: string }> }) {
  const sp = await searchParams;
  const [clients, vehicules, catalogue, reglages] = await Promise.all([
    clientsPourContrat(),
    vehiculesLouables(),
    db.optionLocation.findMany({ where: { actif: true }, orderBy: [{ ordre: "asc" }, { libelle: "asc" }] }),
    lireReglages(),
  ]);
  const vehicule = vehicules.find((v) => v.id === sp.vehicule) ?? null;
  const clientId = clients.some((c) => c.id === sp.client) ? sp.client : undefined;

  return (
    <>
      <Link href="/location" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Location
      </Link>
      <div className="mx-auto max-w-4xl">
        <EnTetePage titre="Nouvelle location" />
      </div>
      <AssistantContrat
        valeurs={valeursNouveauContrat({ clientId, vehicule, jour: sp.jour, jourEcheance: reglages.jourEcheanceMensuelleDefaut })}
        clients={clients}
        vehicules={vehicules}
        catalogue={catalogue}
        toleranceMinutes={reglages.toleranceRetardMinutes}
        anciennetePermisMinAnnees={reglages.anciennetePermisMinAnnees}
      />
    </>
  );
}
