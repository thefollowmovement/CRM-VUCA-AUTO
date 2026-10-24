import type { Metadata } from "next";
import { headers } from "next/headers";
import { BoutonRevoquer, CreationJeton } from "@/components/reglages/jetons-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { normaliserHote } from "@/lib/domaines";
import { formatDateHeure } from "@/lib/format";

export const metadata: Metadata = { title: "Réglages — Extension ANTAI" };

export default async function PageExtensionAntai() {
  const [jetons, entetes] = await Promise.all([
    db.jetonApi.findMany({ orderBy: [{ revoqueLe: { sort: "desc", nulls: "first" } }, { creeLe: "desc" }], include: { creePar: { select: { nom: true } } } }),
    headers(),
  ]);
  // Adresse à coller dans l'extension : celle du CRM tel qu'il est ouvert en ce moment
  const hote = process.env.CRM_DOMAIN ? normaliserHote(process.env.CRM_DOMAIN) : normaliserHote(entetes.get("host"));
  const adresse = `https://${hote}`;
  const actifs = jetons.filter((j) => !j.revoqueLe);
  const revoques = jetons.filter((j) => j.revoqueLe);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Extension Chrome « Désignation ANTAI »</CardTitle>
          <CardDescription>
            L&apos;extension lit les PV « à désigner » du CRM et pré-remplit le formulaire de l&apos;ANTAI ; vous gardez la main sur le captcha et chaque validation. Une fois la désignation
            faite, elle marque le PV « conducteur désigné » (frais de gestion compris).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Créez un jeton ci-dessous (un par ordinateur) et copiez-le.</li>
            <li>
              Dans l&apos;extension : onglet <strong>Réglages</strong>, adresse du CRM <code className="rounded bg-muted px-1 py-0.5">{adresse}</code>, collez le jeton, enregistrez.
            </li>
            <li>
              Cliquez sur <strong>Tester la connexion</strong> : « Connecté » doit s&apos;afficher.
            </li>
          </ol>
          <p className="text-muted-foreground">Le jeton n&apos;est affiché qu&apos;une fois ; le CRM n&apos;en garde qu&apos;une empreinte. Ordinateur perdu ou jeton divulgué : révoquez-le, l&apos;accès est coupé aussitôt.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Jetons actifs ({actifs.length})</CardTitle>
            <CardDescription>120 requêtes par minute au plus pour chaque jeton.</CardDescription>
          </div>
          <CreationJeton />
        </CardHeader>
        <CardContent>
          {actifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun jeton : l&apos;extension ne peut pas encore se connecter.</p>
          ) : (
            <ul className="divide-y" data-testid="jetons-actifs">
              {actifs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {j.nom} <code className="rounded bg-muted px-1 py-0.5 text-xs font-normal">{j.apercu}</code>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Créé le {formatDateHeure(j.creeLe)}
                      {j.creePar ? ` par ${j.creePar.nom}` : ""} · {j.dernierUsageLe ? `dernière utilisation le ${formatDateHeure(j.dernierUsageLe)}` : "jamais utilisé"}
                    </span>
                  </span>
                  <BoutonRevoquer id={j.id} nom={j.nom} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {revoques.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jetons révoqués</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm text-muted-foreground">
              {revoques.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    {j.nom} <code className="text-xs">{j.apercu}</code>
                  </span>
                  <Badge variant="secondary">Révoqué le {formatDateHeure(j.revoqueLe!)}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
