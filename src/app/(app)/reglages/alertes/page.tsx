import type { Metadata } from "next";
import { FormulaireAlertes } from "@/components/reglages/formulaire-alertes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { centimesVersSaisie } from "@/lib/format";
import { lireReglages } from "@/lib/reglages";

export const metadata: Metadata = { title: "Réglages — Numérotation et alertes" };

export default async function PageReglagesAlertes() {
  const r = await lireReglages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Numérotation, alertes et location</CardTitle>
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
            fraisNettoyageCentimes: centimesVersSaisie(r.fraisNettoyageCentimes),
            prixHuitiemeCarburantCentimes: centimesVersSaisie(r.prixHuitiemeCarburantCentimes),
            prixPourcentBatterieCentimes: centimesVersSaisie(r.prixPourcentBatterieCentimes),
          }}
        />
      </CardContent>
    </Card>
  );
}
