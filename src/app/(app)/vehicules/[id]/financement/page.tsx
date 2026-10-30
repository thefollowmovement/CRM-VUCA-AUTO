import { BadgeEuro, Building, Pencil, TriangleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DialogueRepartition } from "@/components/finance/dialogue-repartition";
import { SimulateurVente } from "@/components/finance/simulateur-vente";
import { TableauRepartition } from "@/components/finance/tableau-repartition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pourcentagesBp } from "@/lib/calculs/argent";
import { resumerFinancement } from "@/lib/calculs/financement";
import { formatDate, formatEuros, formatPourcentageBp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bilanVehicule } from "@/server/requetes/rentabilite";
import { obtenirVehicule } from "@/server/requetes/vehicules";

export const metadata = { title: "Financement" };

export default async function PageFinancement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [v, bilan] = await Promise.all([obtenirVehicule(id), bilanVehicule(id)]);
  if (!v || !bilan) notFound();
  const resume = resumerFinancement(
    v.prixAchatCentimes,
    v.participations.map((p) => ({ partenaireId: p.partenaireId, montantCentimes: p.montantCentimes })),
  );
  const modifiable = v.statut !== "ARCHIVE";
  const { rentabilite: r, repartition, parametres, investissements, societeId } = bilan;

  // Partenaires proposés pour les parts fixes : VUCA AUTO + investisseurs + parts déjà saisies
  const idsPartage = [...new Set([societeId, ...investissements.map((i) => i.partenaireId), ...(parametres.partsFixes ?? []).map((p) => p.partenaireId)])];
  const totauxInvest = idsPartage.map((pid) => investissements.find((i) => i.partenaireId === pid)?.totalCentimes ?? 0);
  const bpProrata = totauxInvest.some((t) => t > 0) ? pourcentagesBp(totauxInvest) : totauxInvest.map(() => 0);
  const partenairesPartage = idsPartage.map((pid, i) => ({ id: pid, nom: bilan.noms[pid] ?? "?", estSociete: pid === societeId, partProrataBp: bpProrata[i] ?? 0 }));

  const descriptionRegles =
    (parametres.mode === "POURCENTAGE_FIXE" ? "Partage en pourcentages fixes" : "Partage au prorata de l'investissement") +
    (parametres.commissionBp > 0 ? ` · commission VUCA AUTO ${formatPourcentageBp(parametres.commissionBp)} sur le bénéfice` : "");
  const versements = Object.keys(bilan.verse).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Qui a financé l&apos;achat ?</CardTitle>
            <CardDescription>Prix d&apos;achat : {formatEuros(v.prixAchatCentimes)} le {formatDate(v.dateAchat)}</CardDescription>
          </div>
          {modifiable && (
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
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>
              Répartition du bénéfice
              {r.previsionnel && <span className="ml-2 text-xs font-normal text-muted-foreground">(prévisionnelle)</span>}
            </CardTitle>
            <CardDescription>{descriptionRegles}.</CardDescription>
          </div>
          {modifiable && (
            <DialogueRepartition
              vehiculeId={id}
              mode={parametres.mode}
              commissionBp={parametres.commissionBp}
              partsFixes={parametres.partsFixes ?? []}
              partenaires={partenairesPartage}
            />
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {repartition ? (
            <>
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Coût de revient</dt>
                  <dd className="font-semibold tabular-nums">{formatEuros(r.coutDeRevientCentimes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{r.previsionnel ? "Revenus prévus" : "Revenus"}</dt>
                  <dd className="font-semibold tabular-nums">{formatEuros(r.revenusCentimes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{r.previsionnel ? "Bénéfice prévisionnel" : "Bénéfice net"}</dt>
                  <dd className={cn("font-semibold tabular-nums", (r.beneficeCentimes ?? 0) < 0 ? "text-destructive" : "text-success")}>
                    {formatEuros(r.beneficeCentimes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Commission VUCA AUTO</dt>
                  <dd className="font-semibold tabular-nums">{formatEuros(repartition.commissionCentimes)}</dd>
                </div>
              </dl>
              <TableauRepartition repartition={repartition} noms={bilan.noms} societeId={societeId} verse={bilan.vendu || versements ? bilan.verse : undefined} />
              <p className="text-xs text-muted-foreground">
                Investi = participation à l&apos;achat + dépenses payées de sa poche (hors dépenses payées avec les recettes du véhicule).
                À reverser = investi + part du bénéfice. Les arrondis au centime vont à VUCA AUTO.
                {(bilan.vendu || versements) && " Déjà versé = capital remboursé + bénéfice versé (versements saisis sur la fiche de chaque investisseur)."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Renseignez un prix cible (Modifier) ou une valeur estimée (Résumé) pour voir la répartition prévisionnelle, ou utilisez le simulateur ci-dessous.
            </p>
          )}
          {modifiable && !bilan.vendu && (
            <Button asChild className="self-start">
              <Link href={`/vehicules/${id}/vendre`}>
                <BadgeEuro /> Marquer comme vendu
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {!bilan.vendu && (
        <SimulateurVente
          entree={bilan.entree}
          investissements={investissements}
          parametres={parametres}
          noms={bilan.noms}
          prixInitialCentimes={r.prixVenteRetenuCentimes}
        />
      )}
    </div>
  );
}
