import { Building, Pencil, TriangleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resumerFinancement } from "@/lib/calculs/financement";
import { formatDate, formatEuros, formatPourcentageBp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { obtenirVehicule } from "@/server/requetes/vehicules";

export const metadata = { title: "Financement" };

export default async function PageFinancement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await obtenirVehicule(id);
  if (!v) notFound();
  const resume = resumerFinancement(
    v.prixAchatCentimes,
    v.participations.map((p) => ({ partenaireId: p.partenaireId, montantCentimes: p.montantCentimes })),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Qui a financé l&apos;achat ?</CardTitle>
            <CardDescription>Prix d&apos;achat : {formatEuros(v.prixAchatCentimes)} le {formatDate(v.dateAchat)}</CardDescription>
          </div>
          {v.statut !== "ARCHIVE" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/vehicules/${id}/modifier#financement`}>
                <Pencil /> Modifier
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {v.participations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun financeur enregistré.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Financeur</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Part</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.participations.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/investisseurs/${p.partenaire.id}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                        {p.partenaire.type === "SOCIETE" ? <Building className="size-4 text-primary" /> : <UserRound className="size-4 text-muted-foreground" />}
                        {p.partenaire.nom}
                      </Link>
                      {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatEuros(p.montantCentimes)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPourcentageBp(resume.pourcentagesBp[i])}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Total financé</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuros(resume.totalCentimes)}</TableCell>
                  <TableCell className="text-right">100 %</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {resume.etat !== "complet" && (
            <div className="flex gap-2 rounded-lg border border-warning/60 bg-warning/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className={cn("font-medium")}>
                  {resume.etat === "incomplet"
                    ? `Il manque ${formatEuros(resume.resteCentimes)} pour couvrir le prix d'achat.`
                    : `Le financement dépasse le prix d'achat de ${formatEuros(-resume.resteCentimes)}.`}
                </p>
                {v.ecartFinancementMotif && <p className="text-muted-foreground">Raison indiquée : {v.ecartFinancementMotif}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Répartition du bénéfice</CardTitle>
          <CardDescription>
            Investissement de chacun (achat + dépenses payées), part du bénéfice, total à reverser, déjà versé et reste dû :
            disponible en Phase 3 avec le moteur de calcul.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
