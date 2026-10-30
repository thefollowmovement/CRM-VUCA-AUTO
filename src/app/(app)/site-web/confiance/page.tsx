import type { Metadata } from "next";
import { FormulaireConfiance } from "@/components/site-web/formulaire-confiance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireEngagements, lireListe } from "@/lib/site/reglages-defaut";
import { lireReglagesSite } from "@/server/site/reglages";

export const metadata: Metadata = { title: "Site web — Confiance" };

export default async function PageSiteConfiance() {
  const r = await lireReglagesSite();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confiance</CardTitle>
        <CardDescription>Tout ce qui rassure un acheteur : entreprise identifiable, engagements, preuves.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormulaireConfiance
          valeurs={{
            siret: r.siret ?? "",
            formeJuridique: r.formeJuridique ?? "",
            adresseSiege: r.adresseSiege ?? "",
            engagements: lireEngagements(r.engagements),
            moyensPaiement: lireListe(r.moyensPaiement, 10),
            livraison: r.livraison,
            zoneLivraison: r.zoneLivraison ?? "",
            reprise: r.reprise,
            lienAvisGoogle: r.lienAvisGoogle ?? "",
            afficherVendus: r.afficherVendus,
            joursVendus: String(r.joursVendus),
            afficherNombreVendus: r.afficherNombreVendus,
            seuilNombreVendus: String(r.seuilNombreVendus),
            anneeCreation: r.anneeCreation === null ? "" : String(r.anneeCreation),
            immatriculationVisible: r.immatriculationVisible,
          }}
        />
      </CardContent>
    </Card>
  );
}
