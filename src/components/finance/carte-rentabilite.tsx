// Indicateurs de rentabilité d'un véhicule (section 5.1).
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Rentabilite } from "@/lib/calculs/rentabilite";
import { formatEuros, formatPourcentageBp } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIBELLE_SOURCE: Record<Rentabilite["source"], string> = {
  vente: "Véhicule vendu : chiffres définitifs.",
  prixCible: "Prévisionnel, calculé sur le prix cible.",
  valeurEstimee: "Prévisionnel, calculé sur la dernière valeur estimée.",
  aucune: "Prévisionnel : renseignez un prix cible ou une estimation pour calculer le bénéfice.",
};

export function CarteRentabilite({
  rentabilite: r,
  totalDepensesCentimes,
  autresRevenusCentimes,
  jours,
  action,
}: {
  rentabilite: Rentabilite;
  totalDepensesCentimes: number;
  autresRevenusCentimes: number;
  jours: number;
  action?: React.ReactNode;
}) {
  const p = r.previsionnel;
  const indicateur = (libelle: string, valeur: React.ReactNode, detail?: React.ReactNode, classe?: string) => (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{libelle}</dt>
      <dd className={cn("text-lg font-semibold tabular-nums", classe)}>{valeur}</dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
  const couleur = r.beneficeCentimes === null ? "" : r.beneficeCentimes < 0 ? "text-destructive" : "text-success";

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Rentabilité{p && <span className="ml-2 text-xs font-normal text-muted-foreground">(prévisionnelle)</span>}</CardTitle>
          <CardDescription>{LIBELLE_SOURCE[r.source]}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {indicateur("Coût de revient", formatEuros(r.coutDeRevientCentimes), `dont dépenses ${formatEuros(totalDepensesCentimes)}`)}
          {indicateur(
            p ? (r.source === "valeurEstimee" ? "Valeur estimée" : "Prix cible") : "Prix de vente",
            formatEuros(r.prixVenteRetenuCentimes),
            autresRevenusCentimes !== 0 ? `+ ${formatEuros(autresRevenusCentimes)} de location / assurance` : undefined,
          )}
          {indicateur(p ? "Bénéfice prévisionnel" : "Bénéfice net", formatEuros(r.beneficeCentimes), undefined, couleur)}
          {indicateur("Jours en stock", jours)}
          {indicateur("Marge", formatPourcentageBp(r.margeBp), "bénéfice / prix de vente")}
          {indicateur("ROI", formatPourcentageBp(r.roiBp), "bénéfice / coût de revient")}
        </dl>
      </CardContent>
    </Card>
  );
}
