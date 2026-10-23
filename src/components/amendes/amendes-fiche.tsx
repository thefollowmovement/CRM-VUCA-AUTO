// Bloc « Amendes » des fiches contrat, client et véhicule (composant serveur).
import { ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { etatEcheance } from "@/lib/calculs/amendes";
import { jourParisISO } from "@/lib/dates";
import { formatDate, formatDateHeure, formatEuros } from "@/lib/format";
import { LIBELLES_STATUT_AMENDE, VARIANTE_STATUT_AMENDE } from "@/lib/validations/paiement";

export type AmendeFiche = {
  id: string;
  numeroAvis: string | null;
  infractionLe: Date | null;
  heureInconnue: boolean;
  statut: keyof typeof LIBELLES_STATUT_AMENDE;
  montantCentimes: number | null;
  dateLimite: Date | null;
  contrat?: { numero: string } | null;
  client?: { nom: string; prenom: string | null } | null;
};

export function AmendesFiche({
  amendes,
  lienListe,
  fraisCentimes,
  vide,
}: {
  amendes: AmendeFiche[];
  /** Liste des PV filtrée sur cette fiche. */
  lienListe: string;
  /** Total des frais liés aux PV (refacturations + frais de gestion), fiche contrat. */
  fraisCentimes?: number;
  /** Message quand il n'y a aucun PV (sinon le bloc n'est pas affiché). */
  vide?: string;
}) {
  if (amendes.length === 0 && !vide) return null;
  const aujourdhui = jourParisISO(new Date());
  return (
    <Card data-testid="amendes-fiche">
      <CardHeader>
        <CardTitle>Amendes ({amendes.length})</CardTitle>
        {fraisCentimes ? <CardDescription>Frais amendes facturés sur ce contrat : {formatEuros(fraisCentimes)}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {amendes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{vide}</p>
        ) : (
          <ul className="divide-y">
            {amendes.map((a) => {
              const e = etatEcheance(a.dateLimite, a.statut, aujourdhui);
              return (
                <li key={a.id}>
                  <Link href={`/location/amendes/${a.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-muted/50">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {a.numeroAvis ? `Avis n° ${a.numeroAvis}` : "PV"}
                        <Badge variant={VARIANTE_STATUT_AMENDE[a.statut]}>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
                        {e === "depassee" && <Badge variant="destructive">Délai dépassé</Badge>}
                        {e === "proche" && a.dateLimite && <Badge variant="warning">Avant le {formatDate(a.dateLimite)}</Badge>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.infractionLe ? (a.heureInconnue ? formatDate(a.infractionLe) : formatDateHeure(a.infractionLe)) : "date à lire"}
                        {a.contrat && ` · ${a.contrat.numero}`}
                        {a.client && ` · ${[a.client.prenom, a.client.nom].filter(Boolean).join(" ")}`}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{a.montantCentimes != null ? formatEuros(a.montantCentimes) : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          {amendes.length > 0 && (
            <Link href={lienListe} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Voir dans la liste des PV <ChevronRight className="size-4" />
            </Link>
          )}
          <Link href="/location/amendes/importer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Upload className="size-4" /> Importer des avis
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
