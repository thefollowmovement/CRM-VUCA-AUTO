import { CircleCheck, CircleX, ClipboardCheck, LoaderCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OngletsAmendes } from "@/components/amendes/onglets-amendes";
import { RafraichissementAuto } from "@/components/amendes/suivi-lot";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Raison } from "@/lib/calculs/amendes";
import { formatDateHeure } from "@/lib/format";
import { LIBELLES_STATUT_AMENDE, VARIANTE_STATUT_AMENDE } from "@/lib/validations/paiement";
import { compteursAmendes, etatLot } from "@/server/requetes/amendes-import";

export const metadata: Metadata = { title: "Dépôt d'avis" };

export default async function PageLot({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lot, compteurs] = await Promise.all([etatLot(id), compteursAmendes()]);
  if (!lot) notFound();
  const termine = lot.lus >= lot.total;
  const pourcent = lot.total ? Math.round((lot.lus / lot.total) * 100) : 100;
  return (
    <>
      <EnTetePage titre="Dépôt d'avis" description={`${formatDateHeure(lot.creeLe)}${lot.creePar ? ` · ${lot.creePar.nom}` : ""}`} />
      <OngletsAmendes aValider={compteurs.aValider} aLire={compteurs.aLire} />
      <RafraichissementAuto actif={!termine && lot.cleApi} />
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 md:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-medium" aria-live="polite" data-testid="progression-lot">
              {termine ? <CircleCheck className="size-5 text-success" /> : <LoaderCircle className="size-5 animate-spin text-primary" />}
              {lot.lus} / {lot.total} lu{lot.total > 1 ? "s" : ""}
            </p>
            {termine && (
              <Button asChild>
                <Link href="/location/amendes/a-valider">
                  <ClipboardCheck /> Valider les PV
                </Link>
              </Button>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pourcent} aria-valuemin={0} aria-valuemax={100} aria-label="Lecture des avis">
            <div className="h-full bg-primary transition-all" style={{ width: `${pourcent}%` }} />
          </div>
          {!lot.cleApi && !termine && <p className="text-sm text-muted-foreground">En attente de la clé API Anthropic (Réglages › Amendes).</p>}
        </CardContent>
      </Card>
      <ul className="mt-4 flex flex-col gap-2">
        {lot.amendes.map((a) => {
          const raisons = (a.raisonsVerification ?? []) as Raison[];
          return (
            <li key={a.id}>
              <Link href={`/location/amendes/${a.id}`}>
                <Card className="flex flex-row items-center gap-3 p-3 hover:bg-accent">
                  {a.statut === "A_LIRE" ? <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" /> : a.statut === "IGNORE" ? <CircleX className="size-4 shrink-0 text-muted-foreground" /> : <CircleCheck className="size-4 shrink-0 text-success" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">
                      {a.fichiers[0]?.nomOriginal ?? `Page ${a.fichierPage}`}
                      {a.numeroAvis && <span className="font-normal text-muted-foreground"> · avis n° {a.numeroAvis}</span>}
                    </p>
                    {raisons.length > 0 && <p className="truncate text-muted-foreground">{raisons.map((r) => r.texte).join(" · ")}</p>}
                  </div>
                  <Badge variant={VARIANTE_STATUT_AMENDE[a.statut]}>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
