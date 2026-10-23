import { BadgeAlert, ChevronRight, Plus, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LIBELLES_STATUT_AMENDE, STATUTS_AMENDE, VARIANTE_STATUT_AMENDE } from "@/lib/validations/paiement";
import { listerAmendes } from "@/server/requetes/amendes-sinistres";
import { compteursAmendes } from "@/server/requetes/amendes-import";
import { OngletsAmendes } from "@/components/amendes/onglets-amendes";

export const metadata: Metadata = { title: "PV" };

export default async function PageAmendes({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const sp = await searchParams;
  const statut = (STATUTS_AMENDE as readonly string[]).includes(sp.statut ?? "") ? sp.statut : undefined;
  const [amendes, compteurs] = await Promise.all([listerAmendes(statut), compteursAmendes()]);
  return (
    <>
      <EnTetePage
        titre="PV et amendes"
        description="Le conducteur est retrouvé automatiquement d'après le véhicule et l'heure de l'infraction."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/location/amendes/importer">
                <Upload /> Importer des avis
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/location/amendes/nouvelle">
                <Plus /> Saisir un PV
              </Link>
            </Button>
          </div>
        }
      />
      <OngletsAmendes aValider={compteurs.aValider} aLire={compteurs.aLire} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Tous"], ...STATUTS_AMENDE.map((s) => [s, LIBELLES_STATUT_AMENDE[s]])].map(([v, l]) => (
          <Link
            key={v}
            href={v ? `/location/amendes?statut=${v}` : "/location/amendes"}
            className={cn("rounded-full border px-3 py-1.5", (statut ?? "") === v ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground")}
          >
            {l}
          </Link>
        ))}
      </div>
      {amendes.length === 0 ? (
        <EtatVide icone={BadgeAlert} titre="Aucun PV" description="Saisissez les avis de contravention reçus : ils seront rattachés au bon client." />
      ) : (
        <ul className="flex flex-col gap-2">
          {amendes.map((a) => (
            <li key={a.id}>
              <Link href={`/location/amendes/${a.id}`}>
                <Card className="flex flex-row items-center gap-3 p-4 hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {a.infractionLe ? formatDateHeure(a.infractionLe) : a.numeroAvis ? `Avis n° ${a.numeroAvis}` : "Avis importé"} <Badge variant={VARIANTE_STATUT_AMENDE[a.statut]}>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.vehicule ? (a.vehicule.immatriculation ?? a.nomVehicule) : (a.immatriculationLue ?? "véhicule à identifier")} · {a.client ? [a.client.prenom, a.client.nom].filter(Boolean).join(" ") : "aucune location"}
                      {a.contrat && ` · ${a.contrat.numero}`}
                      {a.lieu && ` · ${a.lieu}`}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatEuros(a.montantCentimes)}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
