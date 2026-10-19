import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireClient } from "@/components/clients/formulaire-client";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { valeursNouveauClient } from "@/lib/client-formulaire";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

export const metadata: Metadata = { title: "Nouveau client" };

export default async function PageNouveauClient() {
  await exigerRolePage(ROLES_GESTION);
  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clients
      </Link>
      <div className="mx-auto max-w-3xl">
        <EnTetePage titre="Nouveau client" description="Seul le nom est obligatoire ; les scans du permis s'ajoutent ensuite sur la fiche." />
      </div>
      <FormulaireClient valeurs={valeursNouveauClient()} />
    </>
  );
}
