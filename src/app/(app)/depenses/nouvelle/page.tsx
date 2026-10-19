import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireDepense } from "@/components/depenses/formulaire-depense";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { retourSur, valeursNouvelleDepense } from "@/lib/depense-formulaire";
import { aujourdhuiISO } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { optionsDepense } from "@/server/requetes/depenses";
import { idSociete } from "@/server/requetes/rentabilite";

export const metadata: Metadata = { title: "Nouvelle dépense" };

export default async function PageNouvelleDepense({
  searchParams,
}: {
  searchParams: Promise<{ vehicule?: string; retour?: string }>;
}) {
  await exigerRolePage(ROLES_GESTION);
  const sp = await searchParams;
  const [options, societeId] = await Promise.all([optionsDepense(), idSociete()]);
  const vehiculeId = options.vehicules.some((v) => v.id === sp.vehicule) ? sp.vehicule! : "";
  const retour = retourSur(sp.retour, vehiculeId ? `/vehicules/${vehiculeId}/depenses` : "/depenses");

  return (
    <>
      <Link href={retour} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <div className="mx-auto max-w-2xl">
        <EnTetePage titre="Nouvelle dépense" description="Montant, catégorie, qui a payé et pour quel véhicule." />
      </div>
      <FormulaireDepense valeurs={valeursNouvelleDepense(aujourdhuiISO(), vehiculeId, societeId)} options={options} retour={retour} />
    </>
  );
}
