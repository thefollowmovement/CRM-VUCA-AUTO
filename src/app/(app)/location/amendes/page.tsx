import { BadgeAlert, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LIBELLES_STATUT_AMENDE, STATUTS_AMENDE } from "@/lib/validations/paiement";
import { listerAmendes } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "PV" };

const VARIANTE = { RECUE: "warning", CONDUCTEUR_DESIGNE: "default", PAYEE: "secondary", REFACTUREE: "success" } as const;

export default async function PageAmendes({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const sp = await searchParams;
  const statut = (STATUTS_AMENDE as readonly string[]).includes(sp.statut ?? "") ? sp.statut : undefined;
  const amendes = await listerAmendes(statut);
  return (
    <>
      <EnTetePage
        titre="PV et amendes"
        description="Le conducteur est retrouvé automatiquement d'après le véhicule et l'heure de l'infraction."
        actions={
          <Button asChild>
            <Link href="/location/amendes/nouvelle">
              <Plus /> Nouveau PV
            </Link>
          </Button>
        }
      />
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
                      {formatDateHeure(a.infractionLe)} <Badge variant={VARIANTE[a.statut]}>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.vehicule.immatriculation ?? a.nomVehicule} · {a.client ? [a.client.prenom, a.client.nom].filter(Boolean).join(" ") : "aucune location"}
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
