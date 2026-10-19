import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListeDepenses, TotauxDepenses } from "@/components/depenses/liste-depenses";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { listerDepenses } from "@/server/requetes/depenses";

export const metadata = { title: "Dépenses" };

export default async function PageDepensesVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.vehicule.findUnique({ where: { id }, select: { id: true, statut: true } });
  if (!v) notFound();
  const resultat = await listerDepenses({ vehicule: id });
  const retour = `/vehicules/${id}/depenses`;
  const ajout = `/depenses/nouvelle?vehicule=${id}&retour=${encodeURIComponent(retour)}`;
  const modifiable = v.statut !== "ARCHIVE";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {resultat.lignes.length} dépense{resultat.lignes.length > 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {resultat.lignes.length > 0 && (
            <Button variant="outline" asChild>
              <a href={`/api/export/depenses?vehicule=${id}`}>
                <Download /> Export
              </a>
            </Button>
          )}
          {modifiable && (
            <Button asChild>
              <Link href={ajout}>
                <Plus /> Ajouter une dépense
              </Link>
            </Button>
          )}
        </div>
      </div>
      <TotauxDepenses resultat={resultat} />
      <ListeDepenses
        resultat={resultat}
        retour={retour}
        afficherVehicule={false}
        actionVide={
          modifiable && (
            <Button asChild>
              <Link href={ajout}>
                <Plus /> Ajouter une dépense
              </Link>
            </Button>
          )
        }
      />
    </div>
  );
}
