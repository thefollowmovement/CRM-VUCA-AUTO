import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { FiltresContrats } from "@/components/location/filtres-contrats";
import { ListeContrats } from "@/components/location/liste-contrats";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { nomVehicule } from "@/lib/vehicule";
import { lireFiltresContrats, listerContrats } from "@/server/requetes/contrats";

export const metadata: Metadata = { title: "Contrats de location" };

export default async function PageContrats({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtres = lireFiltresContrats(await searchParams);
  const [contrats, vehicules] = await Promise.all([
    listerContrats(filtres),
    db.vehicule.findMany({
      where: { contrats: { some: {} } },
      orderBy: [{ marque: "asc" }, { modele: "asc" }],
      select: { id: true, marque: true, modele: true, version: true, immatriculation: true },
    }),
  ]);
  return (
    <>
      <EnTetePage
        titre="Contrats"
        description={`${contrats.length} contrat${contrats.length > 1 ? "s" : ""}`}
        actions={
          <Button asChild>
            <Link href="/location/contrats/nouveau">
              <Plus /> Nouvelle location
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <FiltresContrats vehicules={vehicules.map((v) => ({ id: v.id, libelle: `${nomVehicule(v)}${v.immatriculation ? ` · ${v.immatriculation}` : ""}` }))} />
        <ListeContrats contrats={contrats} />
      </div>
    </>
  );
}
