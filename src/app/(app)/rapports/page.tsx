import { FileSpreadsheet, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FiltrePeriode } from "@/components/analyse/filtre-periode";
import { Anneau } from "@/components/analyse/graphiques";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatEuros, formatPourcentageBp } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lirePeriode } from "@/lib/periode-url";
import { cn } from "@/lib/utils";
import { donneesRapport } from "@/server/requetes/rapports";

export const metadata: Metadata = { title: "Rapports" };

const jour = (iso: string) => formatDate(`${iso}T12:00:00Z`);
const Montant = ({ c, gras }: { c: number; gras?: boolean }) => <span className={cn("tabular-nums", c < 0 && "text-destructive", gras && "font-semibold")}>{formatEuros(c)}</span>;

export default async function PageRapports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigerRolePage(ROLES_GESTION);
  const { periode, du, au, partenaire } = lirePeriode(await searchParams);
  const r = await donneesRapport(du, au, partenaire);
  const t = r.totaux;
  const q = new URLSearchParams({ periode, du, au, ...(r.partenaire ? { partenaire: r.partenaire.id } : {}) }).toString();
  const cartes = [
    { libelle: "Bénéfice net", valeur: t.beneficeNetCentimes },
    { libelle: "CA ventes", valeur: t.caVenteCentimes },
    { libelle: "Bénéfice des ventes", valeur: t.beneficeVenteCentimes },
    { libelle: "Revenus location", valeur: t.revenusLocationCentimes },
    { libelle: "Résultat location", valeur: t.revenusLocationCentimes - t.chargesLocationCentimes },
    { libelle: "Dépenses payées", valeur: t.depensesCentimes },
  ];

  return (
    <>
      <EnTetePage
        titre="Rapports"
        description={`Bilan du ${jour(du)} au ${jour(au)}${r.partenaire ? ` · véhicules financés par ${r.partenaire.nom}` : ""}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/rapports/pdf?${q}`} target="_blank" rel="noopener noreferrer">
                <FileText /> PDF
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/rapports/excel?${q}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
          </>
        }
      />
      <div className="mb-4">
        <FiltrePeriode periode={periode} du={du} au={au} partenaire={r.partenaire?.id} partenaires={r.partenaires} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cartes.map((c) => (
          <Card key={c.libelle} className="gap-1 p-4">
            <p className="text-xs text-muted-foreground">{c.libelle}</p>
            <p className={cn("text-lg font-bold tabular-nums", c.valeur < 0 && "text-destructive")}>{formatEuros(c.valeur)}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Véhicules vendus ({r.vendus.length})</CardTitle>
            <CardDescription>Bénéfice complet du véhicule (vente + revenus de location − coût de revient).</CardDescription>
          </CardHeader>
          <CardContent>
            {r.vendus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Vendu le</TableHead>
                    <TableHead className="text-right">Prix de vente</TableHead>
                    <TableHead className="text-right">Coût de revient</TableHead>
                    <TableHead className="text-right">Bénéfice</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <TableHead className="text-right">Jours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.vendus.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link href={`/vehicules/${v.id}`} className="hover:underline">
                          {v.vehicule}
                        </Link>
                      </TableCell>
                      <TableCell>{jour(v.dateVente)}</TableCell>
                      <TableCell className="text-right">
                        <Montant c={v.prixVenteCentimes} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Montant c={v.coutRevientCentimes} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Montant c={v.beneficeCentimes} gras />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPourcentageBp(v.margeBp)}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.jours}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Véhicules achetés ({r.achetes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {r.achetes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun achat sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Acheté le</TableHead>
                      <TableHead className="text-right">Prix d&apos;achat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.achetes.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Link href={`/vehicules/${v.id}`} className="hover:underline">
                            {v.vehicule}
                          </Link>
                        </TableCell>
                        <TableCell>{jour(v.dateAchat)}</TableCell>
                        <TableCell className="text-right">
                          <Montant c={v.prixAchatCentimes} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        <Montant c={r.achetes.reduce((a, v) => a + v.prixAchatCentimes, 0)} />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
              <CardDescription>Loyers et frais encaissés − charges payées sur la période.</CardDescription>
            </CardHeader>
            <CardContent>
              {r.location.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité de location sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Véhicule</TableHead>
                      <TableHead className="text-right">Revenus</TableHead>
                      <TableHead className="text-right">Charges</TableHead>
                      <TableHead className="text-right">Résultat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.location.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Link href={`/vehicules/${v.id}/location`} className="hover:underline">
                            {v.vehicule}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <Montant c={v.revenusCentimes} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Montant c={v.chargesCentimes} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Montant c={v.resultatCentimes} gras />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        <Montant c={t.revenusLocationCentimes} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Montant c={t.chargesLocationCentimes} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Montant c={t.revenusLocationCentimes - t.chargesLocationCentimes} />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
              <CardDescription>Payées sur la période.</CardDescription>
            </CardHeader>
            <CardContent>
              <Anneau donnees={r.depensesParCategorie.map((c) => ({ libelle: c.categorie, montantCentimes: c.montantCentimes }))} libelleTotal="Dépenses par catégorie" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bénéfice par partenaire</CardTitle>
              <CardDescription>Résultat de chaque véhicule réparti selon ses règles (commission de gestion comprise).</CardDescription>
            </CardHeader>
            <CardContent>
              {r.parPartenaire.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun bénéfice à répartir sur la période.</p>
              ) : (
                <ul className="flex flex-col divide-y text-sm">
                  {r.parPartenaire.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 py-2">
                      <Link href={`/investisseurs/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {p.nom}
                      </Link>
                      <Montant c={p.montantCentimes} gras />
                    </li>
                  ))}
                  <li className="flex items-center gap-2 py-2 font-semibold">
                    <span className="flex-1">Total</span>
                    <Montant c={r.parPartenaire.reduce((a, p) => a + p.montantCentimes, 0)} gras />
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Achat-revente : le bénéfice est compté le jour de la vente (prix de vente − prix d&apos;achat − dépenses). Location : loyers encaissés − charges payées
        sur la période ; à la vente, prix de vente − prix d&apos;achat. Sur toute la vie d&apos;un véhicule, on retrouve exactement son bénéfice.
      </p>
    </>
  );
}
