import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OngletsAmendes } from "@/components/amendes/onglets-amendes";
import { ZoneDepot } from "@/components/amendes/zone-depot";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateHeure } from "@/lib/format";
import { cleApiConfiguree } from "@/server/amendes/lecture";
import { compteursAmendes, derniersLots } from "@/server/requetes/amendes-import";

export const metadata: Metadata = { title: "Importer des avis" };

export default async function PageImporterAvis() {
  const [compteurs, lots] = await Promise.all([compteursAmendes(), derniersLots()]);
  const cle = cleApiConfiguree();
  return (
    <>
      <EnTetePage titre="Importer des avis" description="Déposez les scans reçus : chaque avis est lu automatiquement puis rattaché à la location concernée." />
      <OngletsAmendes aValider={compteurs.aValider} aLire={compteurs.aLire} />
      {!cle && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <span>
            Clé API Anthropic non configurée sur le serveur : les avis déposés resteront « à lire » jusqu&apos;à son ajout (voir{" "}
            <Link href="/reglages/amendes" className="underline">
              Réglages › Amendes
            </Link>
            ).
          </span>
        </p>
      )}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <ZoneDepot />
        </CardContent>
      </Card>
      {lots.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Derniers dépôts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y text-sm">
              {lots.map((l) => (
                <li key={l.id}>
                  <Link href={`/location/amendes/lots/${l.id}`} className="flex items-center justify-between gap-2 py-2 hover:underline">
                    <span>
                      {formatDateHeure(l.creeLe)}
                      {l.creePar && <span className="text-muted-foreground"> · {l.creePar.nom}</span>}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {l._count.amendes} page{l._count.amendes > 1 ? "s" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
