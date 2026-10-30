import type { Metadata } from "next";
import { FormulaireContact } from "@/components/site-web/formulaire-contact";
import { ImageSite } from "@/components/site-web/image-site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { afficherNumero } from "@/lib/site/whatsapp";
import { lireHoraires } from "@/lib/site/reglages-defaut";
import { lireReglagesSite } from "@/server/site/reglages";

export const metadata: Metadata = { title: "Site web — Contact & WhatsApp" };

export default async function PageSiteContact() {
  const r = await lireReglagesSite();
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact & WhatsApp</CardTitle>
          <CardDescription>Le bouton « Écrire sur WhatsApp » est le contact principal du site.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireContact
            valeurs={{
              whatsapp: r.whatsapp ? afficherNumero(r.whatsapp) : "",
              messageWhatsappVehicule: r.messageWhatsappVehicule,
              messageWhatsappGeneral: r.messageWhatsappGeneral,
              telephone: r.telephone ?? "",
              email: r.email ?? "",
              adresse: r.adresse ?? "",
              lienGoogleMaps: r.lienGoogleMaps ?? "",
              horaires: lireHoraires(r.horaires),
              delaiReponse: r.delaiReponse ?? "",
              vendeurNom: r.vendeurNom ?? "",
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Photo de l&apos;interlocuteur</CardTitle>
          <CardDescription>Facultative. Une photo nette et souriante, cadrée sur le visage.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageSite champ="vendeurPhotoId" fichierId={r.vendeurPhotoId} libelle="Photo" forme="rond" />
        </CardContent>
      </Card>
    </div>
  );
}
