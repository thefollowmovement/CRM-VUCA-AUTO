import type { Metadata } from "next";
import { FormulaireLegal } from "@/components/site-web/formulaire-legal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireConfigDomaines } from "@/lib/domaines";
import { champsLegauxManquants, modeleConfidentialite, modeleMentionsLegales, type EntreeLegal } from "@/lib/site/legal";
import { lireReglagesSite } from "@/server/site/reglages";

export const metadata: Metadata = { title: "Site web — Légal" };

export default async function PageSiteLegal() {
  const r = await lireReglagesSite();
  const entree: EntreeLegal = {
    nomAffiche: r.nomAffiche,
    formeJuridique: r.formeJuridique,
    siret: r.siret,
    adresseSiege: r.adresseSiege,
    email: r.email,
    telephone: r.telephone,
    domaine: lireConfigDomaines(process.env).site,
    plausible: !!r.plausibleDomaine,
    googleAnalytics: !!r.googleAnalyticsId,
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Légal</CardTitle>
        <CardDescription>Mentions légales et politique de confidentialité, obligatoires pour un site professionnel.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormulaireLegal
          valeurs={{ mentionsLegales: r.mentionsLegales ?? "", confidentialite: r.confidentialite ?? "" }}
          modeles={{ mentionsLegales: modeleMentionsLegales(entree), confidentialite: modeleConfidentialite(entree) }}
          manquants={champsLegauxManquants(entree)}
        />
      </CardContent>
    </Card>
  );
}
