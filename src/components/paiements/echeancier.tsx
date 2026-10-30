// Échéancier d'un contrat (affichage) : montant, payé, statut, retard.
import { Badge } from "@/components/ui/badge";
import { imputerPaiements, joursRetardEcheance } from "@/lib/calculs/echeancier";
import { dateCalendaireVersISO, formatDate, formatEuros } from "@/lib/format";

type Echeance = { id: string; numero: number; libelle: string; dateEcheance: Date; montantCentimes: number; statut: string };

export function Echeancier({ echeances, paiementsLoyer, aujourdhui }: { echeances: Echeance[]; paiementsLoyer: { id: string; montantCentimes: number }[]; aujourdhui: string }) {
  const actives = echeances.filter((e) => e.statut !== "ANNULEE");
  const imputation = imputerPaiements(actives, paiementsLoyer);
  if (echeances.length === 0) return <p className="text-sm text-muted-foreground">Aucune échéance.</p>;
  return (
    <ul className="flex flex-col divide-y text-sm">
      {echeances.map((e) => {
        const imp = imputation.echeances.find((x) => x.id === e.id);
        const statut = e.statut === "ANNULEE" ? "ANNULEE" : (imp?.statut ?? "A_VENIR");
        const retard = joursRetardEcheance(dateCalendaireVersISO(e.dateEcheance), statut, aujourdhui);
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{formatDate(e.dateEcheance)}</span>
            <span className="min-w-0 flex-1">{e.libelle}</span>
            {statut === "PAYEE" ? (
              <Badge variant="success">Payée</Badge>
            ) : statut === "ANNULEE" ? (
              <Badge variant="secondary">Annulée</Badge>
            ) : retard > 0 ? (
              <Badge variant="destructive">En retard · {retard} j</Badge>
            ) : statut === "PARTIELLE" ? (
              <Badge variant="warning">Partielle</Badge>
            ) : (
              <Badge variant="outline">À venir</Badge>
            )}
            <span className="w-28 text-right tabular-nums">
              {statut === "PARTIELLE" && <span className="block text-xs text-muted-foreground">{formatEuros(imp?.payeCentimes)} payés</span>}
              <span className="font-medium">{formatEuros(e.montantCentimes)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
