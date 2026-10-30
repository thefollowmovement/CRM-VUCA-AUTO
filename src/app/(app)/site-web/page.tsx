import type { Metadata } from "next";
import { FormulaireGeneral } from "@/components/site-web/formulaire-general";
import { ImageSite } from "@/components/site-web/image-site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiseEnLigne } from "@/components/site-web/mise-en-ligne";
import { lireConfigDomaines, urlSite } from "@/lib/domaines";
import { utilisateurCourant } from "@/lib/permissions";
import { etapesMiseEnLigne } from "@/server/site/mise-en-ligne";
import { lireReglagesSite } from "@/server/site/reglages";

export const metadata: Metadata = { title: "Site web — Général" };

export default async function PageSiteGeneral() {
  const [r, { etapes, enLigne }, u] = await Promise.all([lireReglagesSite(), etapesMiseEnLigne(), utilisateurCourant()]);
  const domaine = lireConfigDomaines(process.env).site;
  return (
    <div className="flex flex-col gap-6">
      <MiseEnLigne etapes={etapes} enLigne={enLigne} adresse={domaine ? urlSite("/", domaine) : null} admin={u?.role === "ADMIN"} />
      <Card>
        <CardHeader>
          <CardTitle>Général</CardTitle>
          <CardDescription>Mise en ligne, nom et couleur du site.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireGeneral valeurs={{ enLigne: r.enLigne, nomAffiche: r.nomAffiche, slogan: r.slogan ?? "", couleurAccent: r.couleurAccent }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logos et icône</CardTitle>
          <CardDescription>PNG transparent conseillé. Sans logo, le nom s&apos;affiche en texte.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ImageSite champ="logoClairId" fichierId={r.logoClairId} libelle="Logo pour fond clair" />
          <ImageSite champ="logoFonceId" fichierId={r.logoFonceId} libelle="Logo pour fond foncé (mode sombre)" fond="fonce" />
          <ImageSite champ="faviconId" fichierId={r.faviconId} libelle="Icône de l'onglet (favicon)" aide="Carrée, 512 × 512 px idéalement." />
        </CardContent>
      </Card>
    </div>
  );
}
