import type { Metadata } from "next";
import { FormulaireReferencement } from "@/components/site-web/formulaire-referencement";
import { ImageSite } from "@/components/site-web/image-site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireConfigDomaines } from "@/lib/domaines";
import { seoParDefaut } from "@/lib/site/reglages-defaut";
import { lireReglagesSite } from "@/server/site/reglages";

export const metadata: Metadata = { title: "Site web — Référencement" };

export default async function PageSiteReferencement() {
  const r = await lireReglagesSite();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Référencement</CardTitle>
          <CardDescription>Comment le site apparaît dans Google. Chaque annonce a automatiquement son propre titre et sa description.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireReferencement
            valeurs={{ seoTitre: r.seoTitre ?? "", seoDescription: r.seoDescription ?? "", plausibleDomaine: r.plausibleDomaine ?? "", googleAnalyticsId: r.googleAnalyticsId ?? "" }}
            titreDefaut={seoParDefaut(r.nomAffiche).titre}
            descriptionDefaut={seoParDefaut(r.nomAffiche).description}
            domaine={lireConfigDomaines(process.env).site ?? "vuca-auto.fr"}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Image de partage</CardTitle>
          <CardDescription>
            Affichée quand le lien du site est partagé (WhatsApp, Facebook…). Format 1200 × 630 px. Sans image choisie, une image est créée automatiquement avec votre logo. Chaque annonce a sa propre image (photo de couverture, titre, prix).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageSite champ="imagePartageId" fichierId={r.imagePartageId} libelle="Image de partage" forme="large" />
        </CardContent>
      </Card>
    </div>
  );
}
