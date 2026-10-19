// Tableau de répartition du bénéfice entre partenaires (sans état :
// utilisable dans une page serveur comme dans le simulateur).
import { Building, UserRound } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ResultatRepartition } from "@/lib/calculs/repartition";
import { formatEuros, formatPourcentageBp } from "@/lib/format";
import { cn } from "@/lib/utils";

const signe = (c: number) => (c < 0 ? "text-destructive" : c > 0 ? "text-success" : "");

export function TableauRepartition({
  repartition,
  noms,
  societeId,
  verse,
}: {
  repartition: ResultatRepartition;
  noms: Record<string, string>;
  societeId: string;
  /** Déjà versé à chacun (capital + bénéfice) ; absent = colonnes masquées. */
  verse?: Record<string, number>;
}) {
  const r = repartition;
  const avecVerse = verse !== undefined;
  const totalVerse = avecVerse ? r.lignes.reduce((a, l) => a + (verse[l.partenaireId] ?? 0), 0) : 0;
  const icone = (id: string) =>
    id === societeId ? <Building className="size-4 shrink-0 text-primary" /> : <UserRound className="size-4 shrink-0 text-muted-foreground" />;

  return (
    <>
      {/* Téléphone : une carte par partenaire */}
      <ul className="flex flex-col gap-2 md:hidden">
        {r.lignes.map((l) => {
          const dejaVerse = verse?.[l.partenaireId] ?? 0;
          return (
            <li key={l.partenaireId} className="rounded-lg border p-3 text-sm">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                {icone(l.partenaireId)} {noms[l.partenaireId] ?? "?"}
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">Investi</dt>
                <dd className="text-right tabular-nums">{formatEuros(l.investiCentimes)}</dd>
                {l.depensesCentimes > 0 && (
                  <>
                    <dt className="pl-2 text-xs text-muted-foreground">dont dépenses</dt>
                    <dd className="text-right text-xs tabular-nums text-muted-foreground">{formatEuros(l.depensesCentimes)}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Part du bénéfice</dt>
                <dd className="text-right tabular-nums">{formatPourcentageBp(l.partBeneficeBp)}</dd>
                <dt className="text-muted-foreground">Bénéfice</dt>
                <dd className={cn("text-right font-medium tabular-nums", signe(l.beneficeCentimes))}>{formatEuros(l.beneficeCentimes)}</dd>
                {l.commissionCentimes > 0 && (
                  <>
                    <dt className="pl-2 text-xs text-muted-foreground">dont commission</dt>
                    <dd className="text-right text-xs tabular-nums text-muted-foreground">{formatEuros(l.commissionCentimes)}</dd>
                  </>
                )}
                <dt className="font-medium">À reverser</dt>
                <dd className="text-right font-semibold tabular-nums">{formatEuros(l.aReverserCentimes)}</dd>
                {avecVerse && (
                  <>
                    <dt className="text-muted-foreground">Déjà versé</dt>
                    <dd className="text-right tabular-nums">{formatEuros(dejaVerse)}</dd>
                    <dt className="font-medium">Reste dû</dt>
                    <dd className="text-right font-semibold tabular-nums">{formatEuros(l.aReverserCentimes - dejaVerse)}</dd>
                  </>
                )}
              </dl>
            </li>
          );
        })}
      </ul>

      {/* Ordinateur : tableau */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partenaire</TableHead>
              <TableHead className="text-right">Achat</TableHead>
              <TableHead className="text-right">Dépenses</TableHead>
              <TableHead className="text-right">Investi</TableHead>
              <TableHead className="text-right">Part</TableHead>
              <TableHead className="text-right">Bénéfice</TableHead>
              <TableHead className="text-right">À reverser</TableHead>
              {avecVerse && <TableHead className="text-right">Déjà versé</TableHead>}
              {avecVerse && <TableHead className="text-right">Reste dû</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.lignes.map((l) => {
              const dejaVerse = verse?.[l.partenaireId] ?? 0;
              return (
                <TableRow key={l.partenaireId}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 font-medium">
                      {icone(l.partenaireId)} {noms[l.partenaireId] ?? "?"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuros(l.achatCentimes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuros(l.depensesCentimes)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEuros(l.investiCentimes)}
                    <span className="block text-xs text-muted-foreground">{formatPourcentageBp(l.partInvestissementBp)}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPourcentageBp(l.partBeneficeBp)}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", signe(l.beneficeCentimes))}>
                    {formatEuros(l.beneficeCentimes)}
                    {l.commissionCentimes > 0 && (
                      <span className="block text-xs font-normal text-muted-foreground">dont commission {formatEuros(l.commissionCentimes)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatEuros(l.aReverserCentimes)}</TableCell>
                  {avecVerse && <TableCell className="text-right tabular-nums">{formatEuros(dejaVerse)}</TableCell>}
                  {avecVerse && <TableCell className="text-right font-semibold tabular-nums">{formatEuros(l.aReverserCentimes - dejaVerse)}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(r.lignes.reduce((a, l) => a + l.achatCentimes, 0))}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(r.lignes.reduce((a, l) => a + l.depensesCentimes, 0))}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(r.totalInvestiCentimes)}</TableCell>
              <TableCell className="text-right">100 %</TableCell>
              <TableCell className={cn("text-right tabular-nums", signe(r.beneficeCentimes))}>{formatEuros(r.beneficeCentimes)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(r.totalAReverserCentimes)}</TableCell>
              {avecVerse && <TableCell className="text-right tabular-nums">{formatEuros(totalVerse)}</TableCell>}
              {avecVerse && <TableCell className="text-right tabular-nums">{formatEuros(r.totalAReverserCentimes - totalVerse)}</TableCell>}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );
}
