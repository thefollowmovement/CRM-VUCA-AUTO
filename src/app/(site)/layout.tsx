import type { Metadata, Viewport } from "next";
import { BandeauApercu } from "@/components/site/bandeau-apercu";
import { Bandeau } from "@/components/site/mise-en-page";
import { MesureSite } from "@/components/site/mesure";
import { NavigationSite } from "@/components/site/navigation-site";
import { PiedDePage } from "@/components/site/pied-de-page";
import { inter } from "@/components/site/police";
import { WhatsappFlottantSite } from "@/components/site/whatsapp-flottant-site";
import { lireConfigDomaines, urlSite } from "@/lib/domaines";
import { etatSite } from "@/server/site/etat";
import "./site.css";

const domaine = lireConfigDomaines(process.env).site;

// Pages rendues à chaque demande : toujours à jour après une modification dans le CRM.
export const dynamic = "force-dynamic";

/** Site vitrine public (vuca-auto.fr) : sans connexion, sans le thème ni l'application du CRM. */
export async function generateMetadata(): Promise<Metadata> {
  const { r, maintenance, apercu } = await etatSite();
  return {
    metadataBase: domaine ? new URL(urlSite("/", domaine)) : undefined,
    title: { default: `${r.nom} — Voitures d'occasion`, template: `%s | ${r.nom}` },
    description: `${r.nom} : voitures d'occasion contrôlées, contact direct par WhatsApp.`,
    // En maintenance (ou dans l'aperçu du CRM), rien n'est indexé
    robots: maintenance || apercu ? { index: false, follow: false } : { index: true, follow: true },
    applicationName: r.nom,
    openGraph: { type: "website", locale: "fr_FR", siteName: r.nom },
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
  const style = { "--site-accent-base": r.accent, "--site-sur-accent-base": r.surAccent } as React.CSSProperties;
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
        infos={{ logo, slogan: r.slogan, formeJuridique: r.formeJuridique, siret: r.siret, adresse: r.adresse, telephone: r.telephone, email: r.email, reseaux: r.reseaux }}
      />
      {whatsapp && <WhatsappFlottantSite lien={whatsapp} />}
      {/* Compteurs anonymes : jamais dans l'aperçu du CRM (ni en maintenance, où ce bloc n'est pas affiché) */}
      {!apercu && <MesureSite />}
    </div>
  );
}
