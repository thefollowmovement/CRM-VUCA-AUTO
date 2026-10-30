import type { Metadata } from "next";
import { FormulaireContenu } from "@/components/site-web/formulaire-contenu";
import { ImageSite } from "@/components/site-web/image-site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lireFaq, lireReseaux } from "@/lib/site/reglages-defaut";
import { lireReglagesSite } from "@/server/site/reglages";

export const metadata: Metadata = { title: "Site web — Contenu" };

export default async function PageSiteContenu() {
  const r = await lireReglagesSite();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Contenu</CardTitle>
          <CardDescription>Textes de l&apos;accueil, page « À propos », questions fréquentes et liens.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireContenu
            valeurs={{
              accueilTitre: r.accueilTitre ?? "",
              accueilSousTitre: r.accueilSousTitre ?? "",
              aProposTexte: r.aProposTexte ?? "",
              faq: lireFaq(r.faq),
              bandeau: r.bandeau ?? "",
              reseaux: lireReseaux(r.reseaux),
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Photo « À propos »</CardTitle>
          <CardDescription>Vous, votre équipe ou votre lieu : une vraie photo plutôt qu&apos;une image de banque.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageSite champ="aProposPhotoId" fichierId={r.aProposPhotoId} libelle="Photo" forme="large" />
        </CardContent>
      </Card>
    </div>
  );
}
