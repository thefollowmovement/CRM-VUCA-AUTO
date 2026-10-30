import type { Metadata } from "next";
import { AvisClients } from "@/components/site-web/avis-clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { dateCalendaireVersISO } from "@/lib/format";

export const metadata: Metadata = { title: "Site web — Avis clients" };

export default async function PageSiteAvis() {
  const avis = await db.avisClient.findMany({ orderBy: [{ ordre: "asc" }, { creeLe: "asc" }] });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avis clients</CardTitle>
        <CardDescription>Affichés sur l&apos;accueil, dans l&apos;ordre choisi ici.</CardDescription>
      </CardHeader>
      <CardContent>
        <AvisClients
          avis={avis.map((a) => ({
            id: a.id,
            date: a.date,
            saisie: {
              auteur: a.auteur,
              note: String(a.note),
              texte: a.texte,
              date: dateCalendaireVersISO(a.date),
              vehiculeAchete: a.vehiculeAchete ?? "",
              source: a.source,
              certifieAuthentique: a.certifieAuthentique,
              actif: a.actif,
            },
          }))}
        />
      </CardContent>
    </Card>
  );
}
