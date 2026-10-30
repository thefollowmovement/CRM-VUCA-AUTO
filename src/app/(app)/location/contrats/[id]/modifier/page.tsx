import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssistantContrat } from "@/components/location/assistant-contrat";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { contratVersSaisie } from "@/lib/contrat-formulaire";
import { db } from "@/lib/db";
import { lireReglages } from "@/lib/reglages";
import { clientsPourContrat } from "@/server/requetes/clients";
import { vehiculesLouables } from "@/server/requetes/contrats";

export const metadata: Metadata = { title: "Modifier la location" };

export default async function PageModifierContrat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrat = await db.contratLocation.findUnique({ where: { id }, include: { options: true, conducteursAdditionnels: true } });
  if (!contrat) notFound();
  if (!["RESERVATION", "CONFIRMEE"].includes(contrat.statut)) redirect(`/location/contrats/${id}`);
  const [clients, vehicules, catalogue, reglages] = await Promise.all([
    clientsPourContrat(),
    vehiculesLouables(),
    db.optionLocation.findMany({ where: { OR: [{ actif: true }, { id: { in: contrat.options.flatMap((o) => (o.optionId ? [o.optionId] : [])) } }] }, orderBy: [{ ordre: "asc" }, { libelle: "asc" }] }),
    lireReglages(),
  ]);
  return (
    <>
      <Link href={`/location/contrats/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {contrat.numero}
      </Link>
      <div className="mx-auto max-w-4xl">
        <EnTetePage titre={`Modifier ${contrat.numero}`} description="Le prix est recalculé ; les conditions générales restent celles du jour de la création." />
      </div>
      <AssistantContrat
        contratId={id}
        numero={contrat.numero}
        valeurs={contratVersSaisie(contrat)}
        clients={clients}
        vehicules={vehicules}
        catalogue={catalogue}
        toleranceMinutes={reglages.toleranceRetardMinutes}
        anciennetePermisMinAnnees={reglages.anciennetePermisMinAnnees}
      />
    </>
  );
}
