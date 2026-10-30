import { ChevronRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DommagesVehicule } from "@/components/etat-des-lieux/dommages-vehicule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, formatEuros } from "@/lib/format";
import { LIBELLES_STATUT_SINISTRE } from "@/lib/validations/paiement";
import { listerSinistres } from "@/server/requetes/amendes-sinistres";
import { dommagesVehicule } from "@/server/requetes/etats-des-lieux";

export const metadata = { title: "Dommages" };

export default async function PageDommagesVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.vehicule.findUnique({ where: { id }, select: { id: true, statut: true } });
  if (!v) notFound();
  const [{ actuels, repares }, sinistres] = await Promise.all([dommagesVehicule(id), listerSinistres(id)]);
  return (
    <div className="flex flex-col gap-4">
      <DommagesVehicule vehiculeId={id} actuels={actuels} repares={repares} modifiable={v.statut !== "ARCHIVE"} />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" /> Sinistres
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/location/sinistres/nouveau?vehicule=${id}`}>Déclarer un sinistre</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {sinistres.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun sinistre.</p>
          ) : (
            <ul className="divide-y">
              {sinistres.map((s) => (
                <li key={s.id}>
                  <Link href={`/location/sinistres/${s.id}`} className="flex items-center gap-3 py-2 hover:bg-accent">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {formatDate(s.survenuLe)} <Badge variant="secondary">{LIBELLES_STATUT_SINISTRE[s.statut]}</Badge>
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{s.description}</p>
                    </div>
                    {s.coutEstimeCentimes != null && <span className="text-sm tabular-nums">{formatEuros(s.coutEstimeCentimes)}</span>}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
