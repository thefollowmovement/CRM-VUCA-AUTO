import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoutonSupprimerDepense } from "@/components/depenses/bouton-supprimer-depense";
import { FormulaireDepense } from "@/components/depenses/formulaire-depense";
import { JustificatifsDepense } from "@/components/depenses/justificatifs-depense";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { depenseVersSaisie, retourSur } from "@/lib/depense-formulaire";
import { formatEuros } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { nomVehicule } from "@/lib/vehicule";
import { obtenirDepense, optionsDepense } from "@/server/requetes/depenses";

export const metadata: Metadata = { title: "Dépense" };

export default async function PageDepense({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retour?: string }>;
}) {
  await exigerRolePage(ROLES_GESTION);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const d = await obtenirDepense(id);
  if (!d) notFound();
  const options = await optionsDepense(d.vehiculeId);
  const retour = retourSur(sp.retour, `/vehicules/${d.vehiculeId}/depenses`);

  return (
    <>
      <Link href={retour} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <EnTetePage
          titre={`${d.libelle} · ${formatEuros(d.montantCentimes)}`}
          description={
            <>
              <Link href={`/vehicules/${d.vehicule.id}`} className="hover:underline">
                {nomVehicule(d.vehicule)}
                {d.vehicule.immatriculation && ` · ${d.vehicule.immatriculation}`}
              </Link>{" "}
              · payée par {d.payePar.nom}
            </>
          }
          actions={<BoutonSupprimerDepense id={d.id} retour={retour} />}
        />
        <JustificatifsDepense depenseId={d.id} justificatifs={d.justificatifs} />
      </div>
      <div className="mt-4">
        <FormulaireDepense depenseId={d.id} valeurs={depenseVersSaisie(d)} options={options} retour={retour} />
      </div>
    </>
  );
}
