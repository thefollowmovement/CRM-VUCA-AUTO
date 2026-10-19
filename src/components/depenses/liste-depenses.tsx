import { Building, ChevronRight, Paperclip, Receipt, UserRound } from "lucide-react";
import Link from "next/link";
import { IconeCategorie } from "@/components/reglages/icone-categorie";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatEuros } from "@/lib/format";
import type { listerDepenses } from "@/server/requetes/depenses";

type Resultat = Awaited<ReturnType<typeof listerDepenses>>;

/** Liste des dépenses : cartes sur téléphone, tableau sur ordinateur. */
export function ListeDepenses({
  resultat,
  retour,
  afficherVehicule = true,
  actionVide,
}: {
  resultat: Resultat;
  /** Page où revenir après modification. */
  retour: string;
  afficherVehicule?: boolean;
  actionVide?: React.ReactNode;
}) {
  const { lignes } = resultat;
  if (lignes.length === 0) {
    return (
      <EtatVide
        icone={Receipt}
        titre="Aucune dépense"
        description="Carte grise, réparations, pneus, assurance… chaque dépense compte dans le coût de revient et la répartition."
        action={actionVide}
      />
    );
  }
  const lien = (id: string) => `/depenses/${id}?retour=${encodeURIComponent(retour)}`;

  return (
    <>
      {/* Téléphone : cartes */}
      <div className="flex flex-col gap-2 md:hidden">
        {lignes.map((d) => (
          <Link key={d.id} href={lien(d.id)}>
            <Card className="flex flex-row items-center gap-3 p-3">
              <IconeCategorie icone={d.categorie.icone} couleur={d.categorie.couleur} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.libelle}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(d.date)} · {d.payePar.nom}
                  {afficherVehicule && ` · ${d.vehicule.immatriculation ?? d.nomVehicule}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-semibold tabular-nums">{formatEuros(d.montantCentimes)}</span>
                {d.nbJustificatifs > 0 && <Paperclip className="size-3.5 text-muted-foreground" aria-label="Justificatif" />}
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>

      {/* Ordinateur : tableau */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Dépense</TableHead>
              {afficherVehicule && <TableHead>Véhicule</TableHead>}
              <TableHead>Payé par</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map((d) => (
              <TableRow key={d.id} className="relative">
                <TableCell className="whitespace-nowrap tabular-nums">{formatDate(d.date)}</TableCell>
                <TableCell>
                  <Link href={lien(d.id)} className="flex items-center gap-3 after:absolute after:inset-0">
                    <IconeCategorie icone={d.categorie.icone} couleur={d.categorie.couleur} />
                    <span className="min-w-0">
                      <span className="block font-medium">{d.libelle}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.categorie.nom}
                        {d.fournisseur && ` · ${d.fournisseur}`}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                {afficherVehicule && (
                  <TableCell>
                    <span className="block">{d.nomVehicule}</span>
                    {d.vehicule.immatriculation && <span className="font-mono text-xs text-muted-foreground">{d.vehicule.immatriculation}</span>}
                  </TableCell>
                )}
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    {d.payePar.type === "SOCIETE" ? <Building className="size-3.5 text-primary" /> : <UserRound className="size-3.5 text-muted-foreground" />}
                    {d.payePar.nom}
                  </span>
                  {d.payeSurRecettes && (
                    <Badge variant="secondary" className="ml-2">
                      Sur recettes
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {d.nbJustificatifs > 0 && <Paperclip className="size-3.5 text-muted-foreground" aria-label="Justificatif" />}
                    {formatEuros(d.montantCentimes)}
                  </span>
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

/** Totaux par catégorie et par payeur. */
export function TotauxDepenses({ resultat }: { resultat: Resultat }) {
  if (resultat.lignes.length === 0) return null;
  const max = Math.max(...resultat.parCategorie.map((c) => c.totalCentimes), 1);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between gap-2">
            <span>Par catégorie</span>
            <span className="text-lg tabular-nums">{formatEuros(resultat.totalCentimes)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {resultat.parCategorie.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <IconeCategorie icone={c.icone} couleur={c.couleur} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {c.nom} <span className="text-xs text-muted-foreground">({c.nombre})</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatEuros(c.totalCentimes)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${(c.totalCentimes / max) * 100}%`, backgroundColor: c.couleur ?? "#78716c" }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Par payeur</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {resultat.parPayeur.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
                <span className="inline-flex min-w-0 items-center gap-2">
                  {p.type === "SOCIETE" ? <Building className="size-4 shrink-0 text-primary" /> : <UserRound className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="truncate">{p.nom}</span>
                </span>
                <span className="text-right">
                  <span className="block font-medium tabular-nums">{formatEuros(p.totalCentimes)}</span>
                  {p.surRecettesCentimes > 0 && (
                    <span className="block text-xs text-muted-foreground">dont {formatEuros(p.surRecettesCentimes)} sur recettes</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
