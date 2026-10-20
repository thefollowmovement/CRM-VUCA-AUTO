import { ArrowDown, ArrowUp, ArrowUpDown, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FiltresVehicules, LigneVehicule } from "@/server/requetes/vehicules";
import { BadgeStatut } from "./badge-statut";
import { VignetteVehicule } from "./vignette-vehicule";

function Marge({ valeur, prevision }: { valeur: number | null; prevision: boolean }) {
  if (valeur === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("tabular-nums", valeur < 0 ? "text-destructive" : "text-success")} title={prevision ? "Prévisionnel" : undefined}>
      {formatEuros(valeur)}
      {prevision && <span className="ml-0.5 text-xs text-muted-foreground">*</span>}
    </span>
  );
}

/** Lien de tri d'une colonne (garde les autres filtres). */
function EnTeteTri({
  colonne,
  libelle,
  filtres,
  params,
  className,
}: {
  colonne: string;
  libelle: string;
  filtres: FiltresVehicules;
  params: URLSearchParams;
  className?: string;
}) {
  const actif = filtres.tri === colonne;
  const p = new URLSearchParams(params);
  p.set("tri", colonne);
  p.set("ordre", actif && filtres.ordre === "desc" ? "asc" : "desc");
  const Icone = !actif ? ArrowUpDown : filtres.ordre === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <Link href={`?${p.toString()}`} scroll={false} className={cn("inline-flex items-center gap-1 hover:text-foreground", actif && "text-foreground")}>
        {libelle}
        <Icone className="size-3" />
      </Link>
    </TableHead>
  );
}

export function TableauVehicules({ lignes, filtres, params }: { lignes: LigneVehicule[]; filtres: FiltresVehicules; params: URLSearchParams }) {
  const t = (colonne: string, libelle: string, className?: string) => (
    <EnTeteTri colonne={colonne} libelle={libelle} filtres={filtres} params={params} className={className} />
  );
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16" />
            {t("vehicule", "Véhicule")}
            {t("immatriculation", "Immat.")}
            {t("statut", "Statut")}
            {t("prixAchat", "Achat", "text-right")}
            {t("coutDeRevient", "Coût de revient", "text-right")}
            {t("prixCible", "Prix cible", "text-right")}
            {t("marge", "Marge", "text-right")}
            {t("jours", "Jours", "text-right")}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.map((v) => (
            <TableRow key={v.id} className="relative">
              <TableCell className="py-1.5">
                <VignetteVehicule photoId={v.photoId} alt={v.nom} className="h-10 w-14 rounded-md" />
              </TableCell>
              <TableCell>
                <Link href={`/vehicules/${v.id}`} className="font-medium after:absolute after:inset-0">
                  {v.nom}
                </Link>
                <p className="text-xs text-muted-foreground">{v.financeurs.join(", ") || "Aucun financeur"}</p>
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{v.immatriculation ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <BadgeStatut statut={v.statut} />
                  {v.financementIncoherent && (
                    <TriangleAlert className="size-4 text-amber-600" aria-label="Financement différent du prix d'achat" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(v.prixAchatCentimes)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(v.coutDeRevientCentimes)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatEuros(v.prixCibleCentimes)}</TableCell>
              <TableCell className="text-right">
                <Marge valeur={v.margeCentimes} prevision={v.statut !== "VENDU"} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{v.jours}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function CartesVehicules({ lignes }: { lignes: LigneVehicule[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {lignes.map((v) => (
        <Link key={v.id} href={`/vehicules/${v.id}`}>
          <Card className="overflow-hidden transition-colors hover:border-primary/50">
            <VignetteVehicule photoId={v.photoId} alt={v.nom} className="aspect-[16/9] w-full" />
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.nom}</p>
                  <p className="font-mono text-xs text-muted-foreground">{v.immatriculation ?? "Sans immatriculation"}</p>
                </div>
                <BadgeStatut statut={v.statut} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm [&>div]:min-w-0">
                <div>
                  <dt className="text-xs text-muted-foreground">Coût de revient</dt>
                  <dd className="font-medium tabular-nums">{formatEuros(v.coutDeRevientCentimes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{v.statut === "VENDU" ? "Vendu" : "Prix cible"}</dt>
                  <dd className="font-medium tabular-nums">{formatEuros(v.statut === "VENDU" ? v.prixVenteCentimes : v.prixCibleCentimes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Marge</dt>
                  <dd className="font-medium">
                    <Marge valeur={v.margeCentimes} prevision={v.statut !== "VENDU"} />
                  </dd>
                </div>
              </dl>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {v.jours} jour{v.jours > 1 ? "s" : ""} en stock · {v.financeurs.join(", ") || "aucun financeur"}
                {v.financementIncoherent && <TriangleAlert className="size-3.5 text-amber-600" />}
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
