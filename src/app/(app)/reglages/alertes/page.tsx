import type { Metadata } from "next";
import { FormulaireAlertes } from "@/components/reglages/formulaire-alertes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lireReglages } from "@/lib/reglages";

export const metadata: Metadata = { title: "Réglages — Numérotation et alertes" };

export default async function PageReglagesAlertes() {
  const r = await lireReglages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Numérotation et alertes</CardTitle>
      </CardHeader>
      <CardContent>
        <FormulaireAlertes
          valeurs={{
            prefixeContrat: r.prefixeContrat,
            prefixeFacture: r.prefixeFacture,
            prefixeRecu: r.prefixeRecu,
            joursStockAlerte: r.joursStockAlerte,
            joursAvantEcheanceAlerte: r.joursAvantEcheanceAlerte,
            kmAvantVidangeAlerte: r.kmAvantVidangeAlerte,
            anciennetePermisMinAnnees: r.anciennetePermisMinAnnees,
            toleranceRetardMinutes: r.toleranceRetardMinutes,
            jourEcheanceMensuelleDefaut: r.jourEcheanceMensuelleDefaut,
          }}
        />
      </CardContent>
    </Card>
  );
}
