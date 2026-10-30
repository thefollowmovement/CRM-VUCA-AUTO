// État du site pour la requête en cours (partagé par le layout et les pages grâce à cache()).
import { cache } from "react";
import { urlPhoto } from "@/lib/site/photos";
import { lienWhatsApp } from "@/lib/site/whatsapp";
import { contexteSite } from "./contexte";
import { reglagesPublics } from "./public";

export const etatSite = cache(async () => {
  const [r, { apercu, chemins }] = await Promise.all([reglagesPublics(), contexteSite()]);
  const image = (id: string | null) => (id ? urlPhoto({ id }, 400, chemins.photos) : null);
  return {
    r,
    apercu,
    chemins,
    /** En maintenance, les visiteurs voient « Notre site arrive bientôt » ; l'aperçu du CRM voit le vrai site. */
    maintenance: !r.enLigne && !apercu,
    logo: { nom: r.nom, clair: image(r.logoClairId), fonce: image(r.logoFonceId) },
    photoVendeur: image(r.vendeurPhotoId),
    whatsapp: lienWhatsApp(r.whatsapp, r.messageWhatsappGeneral),
  };
});
