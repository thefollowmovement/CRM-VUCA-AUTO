import { ChevronRight, Plus, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatDate, formatEuros } from "@/lib/format";
import { LIBELLES_STATUT_SINISTRE } from "@/lib/validations/paiement";
import { listerSinistres } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "Sinistres" };

const VARIANTE_SINISTRE = { DECLARE: "warning", EN_EXPERTISE: "default", EN_REPARATION: "default", CLOTURE: "secondary" } as const;

export default async function PageSinistres() {
  const sinistres = await listerSinistres();
  return (
    <>
      <EnTetePage
        titre="Sinistres"
        description="Accidents et dégâts : franchise refacturée au client, indemnité d'assurance comptée dans les revenus du véhicule."
        actions={
          <Button asChild>
            <Link href="/location/sinistres/nouveau">
              <Plus /> Déclarer un sinistre
            </Link>
          </Button>
        }
      />
      {sinistres.length === 0 ? (
        <EtatVide icone={ShieldAlert} titre="Aucun sinistre" description="Tant mieux !" />
      ) : (
        <ul className="flex flex-col gap-2">
          {sinistres.map((s) => (
            <li key={s.id}>
              <Link href={`/location/sinistres/${s.id}`}>
                <Card className="flex flex-row items-center gap-3 p-4 hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {formatDate(s.survenuLe)} · {s.vehicule.immatriculation ?? s.nomVehicule}
                      <Badge variant={VARIANTE_SINISTRE[s.statut]}>{LIBELLES_STATUT_SINISTRE[s.statut]}</Badge>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.description}
                      {s.contrat && ` · ${s.contrat.numero} (${[s.contrat.client.prenom, s.contrat.client.nom].filter(Boolean).join(" ")})`}
                    </p>
                  </div>
                  {s.coutEstimeCentimes != null && <span className="font-semibold tabular-nums">{formatEuros(s.coutEstimeCentimes)}</span>}
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
