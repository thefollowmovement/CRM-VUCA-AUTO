import type { Metadata, Viewport } from "next";
import { Audience } from "@/components/site/audience";
import { BandeauApercu } from "@/components/site/bandeau-apercu";
import { Bandeau } from "@/components/site/mise-en-page";
import { MesureSite } from "@/components/site/mesure";
import { NavigationSite } from "@/components/site/navigation-site";
import { PiedDePage } from "@/components/site/pied-de-page";
import { inter } from "@/components/site/police";
import { WhatsappFlottantSite } from "@/components/site/whatsapp-flottant-site";
import { lireConfigDomaines, urlSite } from "@/lib/domaines";
import { variablesAccent } from "@/lib/site/couleurs";
import { urlPhoto } from "@/lib/site/photos";
import { seoParDefaut } from "@/lib/site/reglages-defaut";
import { etatSite } from "@/server/site/etat";
import "./site.css";

const domaine = lireConfigDomaines(process.env).site;

// Pages rendues à chaque demande : toujours à jour après une modification dans le CRM.
export const dynamic = "force-dynamic";

/** Site vitrine public (vuca-auto.fr) : sans connexion, sans le thème ni l'application du CRM. */
export async function generateMetadata(): Promise<Metadata> {
  const { r, maintenance, apercu, chemins } = await etatSite();
  const defaut = seoParDefaut(r.nom);
  const titre = r.seoTitre ?? defaut.titre;
  const description = r.seoDescription ?? defaut.description;
  const icone = r.faviconId ? urlPhoto({ id: r.faviconId }, 400, chemins.photos) : null;
  const imagePartage = r.imagePartageId ? urlPhoto({ id: r.imagePartageId }, 1280, chemins.photos) : `${chemins.base}/partage/site`;
  return {
    metadataBase: domaine ? new URL(urlSite("/", domaine)) : undefined,
    // « absolute » : sinon le modèle du layout racine (CRM) s'appliquerait au titre par défaut
    title: { absolute: titre, template: `%s | ${r.nom}` },
    description,
    // En maintenance (ou dans l'aperçu du CRM), rien n'est indexé
    robots: maintenance || apercu ? { index: false, follow: false } : { index: true, follow: true },
    applicationName: r.nom,
    icons: icone ? { icon: icone, apple: icone } : undefined,
    openGraph: { type: "website", locale: "fr_FR", siteName: r.nom, title: titre, description, images: [{ url: imagePartage, alt: r.nom }] },
    twitter: { card: "summary_large_image", title: titre, description, images: [imagePartage] },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function LayoutSite({ children }: { children: React.ReactNode }) {
  const { r, apercu, chemins, maintenance, logo, whatsapp } = await etatSite();
  const style = variablesAccent(r.accent) as React.CSSProperties;
  if (maintenance) {
    // Habillage minimal : chaque page affiche « Notre site arrive bientôt » (la 404 reste une 404)
    return (
      <div className={`site ${inter.variable}`} style={style}>
        {children}
      </div>
    );
  }
  return (
    <div className={`site flex flex-col ${inter.variable}`} style={style}>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-site-carte focus:px-4 focus:py-2 focus:shadow-site">
        Aller au contenu
      </a>
      {apercu && <BandeauApercu enLigne={r.enLigne} adressePublique={domaine ? urlSite("/", domaine) : null} />}
      {r.bandeau && <Bandeau texte={r.bandeau} />}
      <NavigationSite logo={logo} lienWhatsApp={whatsapp} accueil={chemins.accueil} base={chemins.base} />
      <div id="contenu" className="flex-1">
        {children}
      </div>
      <PiedDePage
        base={chemins.base}
        cookies={!!r.googleAnalyticsId}
        infos={{ logo, slogan: r.slogan, formeJuridique: r.formeJuridique, siret: r.siret, adresse: r.adresse, telephone: r.telephone, email: r.email, reseaux: r.reseaux }}
      />
      {whatsapp && <WhatsappFlottantSite lien={whatsapp} />}
      {/* Compteurs anonymes : jamais dans l'aperçu du CRM (ni en maintenance, où ce bloc n'est pas affiché) */}
      {!apercu && <MesureSite />}
      {!apercu && (r.plausibleDomaine || r.googleAnalyticsId) && <Audience plausible={r.plausibleDomaine} googleAnalytics={r.googleAnalyticsId} />}
    </div>
  );
}
