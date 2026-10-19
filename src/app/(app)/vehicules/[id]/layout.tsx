import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsVehicule } from "@/components/vehicules/actions-vehicule";
import { BadgeStatut } from "@/components/vehicules/badge-statut";
import { OngletsVehicule } from "@/components/vehicules/onglets-vehicule";
import { VignetteVehicule } from "@/components/vehicules/vignette-vehicule";
import { db } from "@/lib/db";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { LIBELLES_TYPE, nomVehicule } from "@/lib/vehicule";

export default async function LayoutVehicule({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const v = await db.vehicule.findUnique({
    where: { id },
    select: {
      id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true, typeExploitation: true,
      ecartFinancementAccepte: true, prixAchatCentimes: true,
      fichiers: { where: { categorie: "PHOTO_VEHICULE", estPrincipale: true }, select: { id: true }, take: 1 },
    },
  });
  if (!v) notFound();
  const nom = nomVehicule(v);

  return (
    <>
      <Link href="/vehicules" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Véhicules
      </Link>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <VignetteVehicule photoId={v.fichiers[0]?.id ?? null} alt={nom} className="size-16 shrink-0 rounded-xl md:size-20" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight md:text-2xl">{nom}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {v.immatriculation && (
                <span className="rounded border bg-card px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">{v.immatriculation}</span>
              )}
              <BadgeStatut statut={v.statut} />
              <span>{LIBELLES_TYPE[v.typeExploitation]}</span>
              {v.ecartFinancementAccepte && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="size-3.5" /> Écart de financement
                </span>
              )}
            </div>
          </div>
        </div>
        <ActionsVehicule id={v.id} nom={nom} statut={v.statut} estAdmin={utilisateur.role === "ADMIN"} />
      </div>
      <OngletsVehicule id={v.id} location={v.typeExploitation !== "ACHAT_REVENTE"} />
      {children}
    </>
  );
}
