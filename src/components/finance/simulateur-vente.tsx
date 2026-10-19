"use client";

import { Calculator } from "lucide-react";
import { useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { TableauRepartition } from "@/components/finance/tableau-repartition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculerRentabilite, type EntreeRentabilite } from "@/lib/calculs/rentabilite";
import { repartirBenefice, type Investissement, type ParametresRepartition } from "@/lib/calculs/repartition";
import { centimesVersSaisie, formatEuros, formatPourcentageBp, parseEurosEnCentimes } from "@/lib/format";
import { cn } from "@/lib/utils";

/** « Et si je vends à X € ? » : calcul en direct avec les mêmes fonctions que le serveur. */
export function SimulateurVente({
  entree,
  investissements,
  parametres,
  noms,
  prixInitialCentimes,
}: {
  entree: EntreeRentabilite;
  investissements: Investissement[];
  parametres: ParametresRepartition;
  noms: Record<string, string>;
  prixInitialCentimes: number | null;
}) {
  const [saisie, setSaisie] = useState(centimesVersSaisie(prixInitialCentimes));
  const prix = parseEurosEnCentimes(saisie);
  const valide = prix !== null && prix > 0;
  const r = valide ? calculerRentabilite({ ...entree, prixVenteCentimes: prix }) : null;
  const repartition = r && r.beneficeCentimes !== null ? repartirBenefice(investissements, r.beneficeCentimes, parametres) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-5 text-primary" /> Simulateur
        </CardTitle>
        <CardDescription>Et si le véhicule se vendait à… ? Rien n&apos;est enregistré.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex w-48 flex-col gap-1.5 text-sm font-medium">
            Prix de vente
            <ChampMontant value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Prix de vente simulé" />
          </label>
          {r && (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Bénéfice</dt>
                <dd className={cn("font-semibold tabular-nums", (r.beneficeCentimes ?? 0) < 0 ? "text-destructive" : "text-success")}>
                  {formatEuros(r.beneficeCentimes)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Marge</dt>
                <dd className="font-semibold tabular-nums">{formatPourcentageBp(r.margeBp)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">ROI</dt>
                <dd className="font-semibold tabular-nums">{formatPourcentageBp(r.roiBp)}</dd>
              </div>
            </dl>
          )}
        </div>
        {repartition ? (
          <TableauRepartition repartition={repartition} noms={noms} societeId={parametres.societeId} />
        ) : (
          <p className="text-sm text-muted-foreground">Saisissez un prix de vente.</p>
        )}
      </CardContent>
    </Card>
  );
}
