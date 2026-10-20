import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNombre } from "@/lib/format";
import { statsSite } from "@/server/site/statistiques";

export const metadata: Metadata = { title: "Site web — Statistiques" };

const LIBELLES = { VUE_SITE: "Visites du site", VUE_ANNONCE: "Vues d'annonces", CLIC_WHATSAPP: "Clics WhatsApp", CLIC_APPEL: "Clics « Appeler »" } as const;

export default async function PageSiteStatistiques() {
  const { totaux, top } = await statsSite();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
          <CardDescription>Compteurs anonymes (aucun cookie, aucune adresse IP conservée).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(Object.keys(LIBELLES) as (keyof typeof LIBELLES)[]).map((t) => (
            <div key={t} className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">{LIBELLES[t]}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{formatNombre(totaux[t].sept)}</p>
              <p className="text-xs text-muted-foreground">7 jours · {formatNombre(totaux[t].trente)} sur 30 jours</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Annonces les plus vues (30 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas encore de visite enregistrée.</p>
          ) : (
            <ol className="flex flex-col divide-y">
              {top.map((a, i) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="w-5 text-muted-foreground tabular-nums">{i + 1}.</span>
                  <Link href={`/vehicules/${a.vehiculeId}/annonce`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {a.titre}
                  </Link>
                  <span className="tabular-nums">{formatNombre(a.vues)} vues</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatNombre(a.clics)} clics WhatsApp{a.vues > 0 && ` (${Math.round((a.clics / a.vues) * 100)} %)`}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
