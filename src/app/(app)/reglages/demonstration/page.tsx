import { CircleCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { RetraitDemo } from "@/components/reglages/retrait-demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyserDemo } from "@/server/demo";

export const metadata: Metadata = { title: "Réglages — Démonstration" };

const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

/** Données de démonstration : aperçu exact de ce qui sera retiré, puis retrait en un clic (ADMIN). */
export default async function PageDemonstration() {
  const plan = await analyserDemo();
  const n = plan.nombres;
  const aRetirer = plan.vehicules.length + plan.clients.length + plan.investisseurs.length + plan.reglagesSite.length > 0;
  const resume = [pluriel(plan.vehicules.length, "véhicule"), pluriel(plan.clients.length, "client"), pluriel(plan.investisseurs.length, "investisseur")].join(", ");

  if (!aRetirer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Démonstration</CardTitle>
          <CardDescription>Données d&apos;exemple chargées à l&apos;installation.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-start gap-2 text-sm">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
            {plan.retiree ? "La démonstration a été retirée. Elle ne sera plus jamais rechargée, même lors des mises à jour." : "Aucune donnée de démonstration n'est présente."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Retirer la démonstration</CardTitle>
          <CardDescription>
            À faire avant de mettre le site en ligne. Seules les fiches créées par la démonstration sont supprimées : vos propres véhicules, clients, investisseurs et réglages ne sont pas touchés.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm">
          <div>
            <p className="mb-2 font-medium">Seront supprimés</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>
                {pluriel(plan.vehicules.length, "véhicule")} de démonstration
                {plan.vehicules.length > 0 && <span className="text-muted-foreground"> : {plan.vehicules.map((v) => v.libelle).join(", ")}</span>}
              </li>
              <li>
                avec leurs {pluriel(n.contrats, "location")}, {pluriel(n.paiements, "paiement")}, {pluriel(n.depenses, "dépense")}, {pluriel(n.factures, "facture")},{" "}
                {pluriel(n.versements, "versement")}, {pluriel(n.annonces, "annonce")} et {pluriel(n.fichiers, "photo ou document", "photos et documents")}
              </li>
              {plan.clients.length > 0 && (
                <li>
                  {pluriel(plan.clients.length, "client")} fictif
                  {plan.clients.length > 1 ? "s" : ""} <span className="text-muted-foreground">: {plan.clients.map((c) => c.libelle).join(", ")}</span>
                </li>
              )}
              {plan.investisseurs.length > 0 && (
                <li>
                  {pluriel(plan.investisseurs.length, "investisseur")} fictif
                  {plan.investisseurs.length > 1 ? "s" : ""} <span className="text-muted-foreground">: {plan.investisseurs.map((p) => p.libelle).join(", ")}</span>
                </li>
              )}
              <li>les visites fictives des statistiques du site</li>
              {plan.reglagesSite.length > 0 && <li>remis à zéro dans Site web : {plan.reglagesSite.map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join(", ")}</li>}
            </ul>
          </div>
          {plan.conserves.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="mb-1 flex items-center gap-2 font-medium">
                <TriangleAlert className="size-4 shrink-0" aria-hidden /> Conservés car utilisés par vos données
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {plan.conserves.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-muted-foreground">
            La numérotation (contrats, reçus, factures, annonces) repart du dernier numéro restant. Une sauvegarde automatique de la base est faite chaque nuit ; pour plus de sécurité, lancez-en une
            juste avant (voir le guide du site).
          </p>
          <div>
            <RetraitDemo resume={`Seront supprimés : ${resume} de démonstration et tout ce qui leur est rattaché.`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
