"use client";

import { ExternalLink, Globe, LoaderCircle, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Interrupteur } from "@/components/ui/interrupteur";
import { formatDateHeure } from "@/lib/format";
import { publierAnnonce } from "@/server/actions/annonces";

/** Interrupteur « Publier sur le site » + état de l'annonce et avertissements. */
export function PublicationAnnonce(p: {
  vehiculeId: string;
  publiee: boolean;
  publiable: boolean;
  statut: string;
  prixRenseigne: boolean;
  nbPhotosPubliques: number;
  url: string;
  reference: string;
  misAJourLe: Date;
  dejaPubliee: boolean;
  siteEnLigne: boolean;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const basculer = async (publier: boolean) => {
    setEnCours(true);
    if (traiterResultat(await publierAnnonce(p.vehiculeId, publier))) router.refresh();
    setEnCours(false);
  };
  const avertissements = [
    !p.publiable && `Publication possible seulement pour un véhicule « En vente » ou « Réservé » (actuellement : ${p.statut}).`,
    !p.prixRenseigne && "Indiquez le prix affiché (ci-dessous).",
    p.nbPhotosPubliques === 0 && "Aucune photo publique : cochez les photos à montrer (section Photos).",
    p.nbPhotosPubliques > 0 && p.nbPhotosPubliques < 8 && `Seulement ${p.nbPhotosPubliques} photo${p.nbPhotosPubliques > 1 ? "s" : ""} publique${p.nbPhotosPubliques > 1 ? "s" : ""} : 8 photos ou plus inspirent davantage confiance.`,
    p.publiee && !p.siteEnLigne && "Le site est en maintenance : l'annonce sera visible dès que le site sera mis en ligne (onglet Site web).",
  ].filter((x): x is string => !!x);

  return (
    <Card className={p.publiee ? "border-success/50" : undefined}>
      <CardContent className="flex flex-col gap-3 pt-4 md:pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Globe className={`size-6 shrink-0 ${p.publiee ? "text-success" : "text-muted-foreground"}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{p.publiee ? "Publiée sur le site" : "Non publiée"}</p>
            <p className="text-sm text-muted-foreground">
              Référence {p.reference} · annonce mise à jour le {formatDateHeure(p.misAJourLe)}
            </p>
          </div>
          {enCours && <LoaderCircle className="size-5 animate-spin text-muted-foreground" />}
          <label htmlFor="publier" className="text-sm font-medium">
            Publier sur le site
          </label>
          <Interrupteur id="publier" actif={p.publiee} onChange={basculer} libelle="Publier sur le site" desactive={enCours || (!p.publiee && !p.publiable)} />
        </div>
        {avertissements.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {avertissements.map((a) => (
              <li key={a} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {a}
              </li>
            ))}
          </ul>
        )}
        {(p.publiee || p.dejaPubliee) && (
          <Button variant="outline" size="sm" className="self-start" asChild>
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Voir l&apos;annonce sur le site
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
