import { Download, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FiltresDepenses } from "@/components/depenses/filtres-depenses";
import { ListeDepenses, TotauxDepenses } from "@/components/depenses/liste-depenses";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lireFiltresDepenses, listerDepenses, optionsDepense } from "@/server/requetes/depenses";

export const metadata: Metadata = { title: "Dépenses" };

export default async function PageDepenses({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerRolePage(ROLES_GESTION);
  const sp = await searchParams;
  const filtres = lireFiltresDepenses(sp);
  const [resultat, options, payeurs] = await Promise.all([
    listerDepenses(filtres),
    optionsDepense(),
    // Tous les partenaires ayant payé au moins une dépense (y compris archivés)
    db.partenaire.findMany({ where: { depensesPayees: { some: {} } }, orderBy: [{ type: "asc" }, { nom: "asc" }], select: { id: true, nom: true } }),
  ]);
  const requete = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v) as [string, string][]).toString();
  const retour = "/depenses";

  return (
    <>
      <EnTetePage
        titre="Dépenses"
        description="Chaque dépense entre dans le coût de revient du véhicule et dans l'investissement de celui qui l'a payée."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/export/depenses${requete ? `?${requete}` : ""}`}>
                <Download /> Export Excel
              </a>
            </Button>
            <Button asChild>
              <Link href="/depenses/nouvelle">
                <Plus /> Nouvelle dépense
              </Link>
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        <FiltresDepenses
          vehicules={options.vehicules.map((v) => ({ id: v.id, libelle: v.libelle }))}
          categories={options.categories.map((c) => ({ id: c.id, libelle: c.nom }))}
          payeurs={payeurs.map((p) => ({ id: p.id, libelle: p.nom }))}
        />
        <TotauxDepenses resultat={resultat} />
        <ListeDepenses
          resultat={resultat}
          retour={retour}
          actionVide={
            <Button asChild>
              <Link href="/depenses/nouvelle">
                <Plus /> Saisir une dépense
              </Link>
            </Button>
          }
        />
      </div>
    </>
  );
}
