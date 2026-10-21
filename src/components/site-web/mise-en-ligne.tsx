import { ChevronRight, CircleCheck, Circle, Globe } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EtapeMiseEnLigne } from "@/server/site/mise-en-ligne";

/** Carte « Avant la mise en ligne » : ce qui reste à faire, dans l'ordre, avec un lien vers chaque réglage. */
export function MiseEnLigne({ etapes, enLigne, adresse, admin }: { etapes: EtapeMiseEnLigne[]; enLigne: boolean; adresse: string | null; admin: boolean }) {
  const restantes = etapes.filter((e) => !e.fait && !e.facultatif).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-5" aria-hidden /> {enLigne ? "Le site est en ligne" : "Avant la mise en ligne"}
        </CardTitle>
        <CardDescription>
          {enLigne
            ? restantes
              ? `Le site est visible par tous${adresse ? ` sur ${adresse}` : ""}, mais ${restantes} point(s) restent à régler.`
              : `Le site est visible par tous${adresse ? ` sur ${adresse}` : ""}.`
            : restantes
              ? `${restantes} étape(s) avant d'activer « Site en ligne » ci-dessous. Tant que le site est en maintenance, les visiteurs voient « Notre site arrive bientôt ».`
              : "Tout est prêt : activez « Site en ligne » ci-dessous."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col divide-y">
          {etapes.map((e) => {
            const accessible = e.cle !== "demo" || admin;
            const contenu = (
              <>
                {e.fait ? <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-label="Fait" /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="À faire" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("text-sm font-medium", e.fait && "text-muted-foreground")}>
                    {e.libelle}
                    {e.facultatif && <span className="font-normal text-muted-foreground"> (facultatif)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {e.detail}
                    {!accessible && !e.fait && " À faire par l'administrateur (Réglages → Démonstration)."}
                  </span>
                </span>
                {accessible && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
              </>
            );
            return (
              <li key={e.cle}>
                {accessible ? (
                  <Link href={e.lien} className="-mx-2 flex min-h-12 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
                    {contenu}
                  </Link>
                ) : (
                  <div className="flex min-h-12 items-center gap-3 py-2">{contenu}</div>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
