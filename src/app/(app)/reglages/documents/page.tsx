import type { Metadata } from "next";
import { FormulaireDocuments } from "@/components/reglages/formulaire-documents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireReglages } from "@/lib/reglages";

export const metadata: Metadata = { title: "Réglages — Documents" };

export default async function PageReglagesDocuments() {
  const r = await lireReglages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Textes des documents</CardTitle>
        <CardDescription>Conditions générales et mentions imprimées sur les PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormulaireDocuments
          valeurs={{
            conditionsGenerales: r.conditionsGenerales ?? "",
            mentionFacture: r.mentionFacture ?? "",
            mentionsContrat: r.mentionsContrat ?? "",
            mentionsEtatDesLieux: r.mentionsEtatDesLieux ?? "",
          }}
        />
      </CardContent>
    </Card>
  );
}
