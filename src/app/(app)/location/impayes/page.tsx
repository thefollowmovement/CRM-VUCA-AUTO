import { CircleCheck, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatEuros } from "@/lib/format";
import { impayes } from "@/server/requetes/paiements";

export const metadata: Metadata = { title: "Impayés" };

const jj = (iso: string) => iso.split("-").reverse().join("/");

export default async function PageImpayes() {
  const r = await impayes();
  return (
    <>
      <EnTetePage titre="Impayés" description={`Échéances en retard : ${formatEuros(r.totalEnRetard)}`} />
      {r.echeancesEnRetard.length === 0 && r.soldes.length === 0 ? (
        <EtatVide icone={CircleCheck} titre="Aucun impayé" description="Toutes les échéances échues sont réglées." />
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Échéances en retard ({r.echeancesEnRetard.length})</CardTitle>
              <CardDescription>Date dépassée et pas (entièrement) payée.</CardDescription>
            </CardHeader>
            <CardContent>
              {r.echeancesEnRetard.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune.</p>
              ) : (
                <ul className="flex flex-col divide-y text-sm">
                  {r.echeancesEnRetard.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                      <Badge variant="destructive">{e.jours} j de retard</Badge>
                      <Link href={`/location/contrats/${e.contratId}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block font-medium">
                          {e.client} · {e.numero}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {e.libelle.replace(/ \(du .*\)$/, "")} · due le {jj(e.date)} · {e.vehicule}
                        </span>
                      </Link>
                      <span className="font-semibold tabular-nums">{formatEuros(e.reste)}</span>
                      <Button size="sm" asChild>
                        <Link href={`/location/contrats/${e.contratId}?encaisser=1`}>Encaisser</Link>
                      </Button>
                      {e.telephone && (
                        <Button variant="outline" size="icon" asChild aria-label={`Appeler ${e.client}`}>
                          <a href={`tel:${e.telephone.replace(/\s/g, "")}`}>
                            <Phone />
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {r.soldes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Locations terminées non soldées ({r.soldes.length})</CardTitle>
                <CardDescription>Reste à payer (frais du retour…) ou trop-perçu à rembourser.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y text-sm">
                  {r.soldes.map((s) => (
                    <li key={s.contratId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                      <Link href={`/location/contrats/${s.contratId}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block font-medium">
                          {s.client} · {s.numero}
                        </span>
                        <span className="block text-xs text-muted-foreground">{s.vehicule}</span>
                      </Link>
                      <span className={`font-semibold tabular-nums ${s.reste < 0 ? "text-amber-700" : ""}`}>
                        {s.reste < 0 ? `Trop-perçu ${formatEuros(-s.reste)}` : formatEuros(s.reste)}
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/location/contrats/${s.contratId}?encaisser=1`}>{s.reste < 0 ? "Rembourser" : "Encaisser"}</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
