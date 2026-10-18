import type { Metadata } from "next";
import { CarteLogo } from "@/components/reglages/carte-logo";
import { FormulaireSociete } from "@/components/reglages/formulaire-societe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireReglages } from "@/lib/reglages";

export const metadata: Metadata = { title: "Réglages — Société" };

export default async function PageReglagesSociete() {
  const r = await lireReglages();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations de la société</CardTitle>
          <CardDescription>Elles apparaissent sur les contrats, états des lieux, reçus, factures et relevés.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireSociete
            valeurs={{
              societeNom: r.societeNom,
              societeAdresse: r.societeAdresse ?? "",
              societeCodePostal: r.societeCodePostal ?? "",
              societeVille: r.societeVille ?? "",
              societeSiret: r.societeSiret ?? "",
              societeTelephone: r.societeTelephone ?? "",
              societeEmail: r.societeEmail ?? "",
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <CarteLogo logoId={r.logoId} />
        </CardContent>
      </Card>
    </div>
  );
}
