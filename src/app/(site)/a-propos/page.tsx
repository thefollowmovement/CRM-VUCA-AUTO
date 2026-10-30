import type { Metadata } from "next";
import { Etapes } from "@/components/site/blocs";
import { Bouton } from "@/components/site/bouton";
import { Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { SectionConfiance } from "@/components/site/sections";
import { TexteRiche } from "@/components/site/texte-riche";
import { urlPhoto } from "@/lib/site/photos";
import { etatSite } from "@/server/site/etat";
import { nombreVehiculesVendus, reglagesVendus, texteAPropos } from "@/server/site/public";

export const metadata: Metadata = { title: "À propos", alternates: { canonical: "/a-propos" } };

export default async function PageAPropos() {
  const { r, chemins, maintenance, logo, whatsapp } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;
  const [contenu, vendus] = await Promise.all([texteAPropos(), reglagesVendus()]);
  const nombreVendus = vendus.afficherNombreVendus ? await nombreVehiculesVendus() : 0;
  const photo = contenu.photoId ? urlPhoto({ id: contenu.photoId }, 1280, chemins.photos) : null;

  return (
    <main>
      <Section className="pt-12 md:pt-20">
        <Conteneur etroit>
          <EnTeteSection niveau={1} titre="À propos de" accent={r.nom} intro={r.slogan ?? undefined} />
          {photo && (
            // Photo « à propos » choisie dans le CRM (non recadrée)
            <img src={photo} alt={`${r.nom}`} className="mb-10 w-full rounded-carte object-cover" loading="eager" />
          )}
          {contenu.texte ? (
            <TexteRiche texte={contenu.texte} className="text-[19px] leading-relaxed" />
          ) : (
            <p className="s-intro">Achat et vente de voitures d&apos;occasion. Pour toute question, écrivez-nous : nous vous répondons directement.</p>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            <Bouton href={chemins.voitures()} taille="grand">Voir nos voitures</Bouton>
            {whatsapp && (
              <Bouton href={whatsapp} externe variante="whatsapp" taille="grand">
                Écrire sur WhatsApp
              </Bouton>
            )}
          </div>
        </Conteneur>
      </Section>
      <SectionConfiance r={r} nombreVendus={vendus.afficherNombreVendus && nombreVendus >= vendus.seuilNombreVendus ? nombreVendus : null} />
      <Section>
        <Conteneur>
          <EnTeteSection titre="3 étapes," accent="zéro prise de tête" />
          <Etapes />
        </Conteneur>
      </Section>
    </main>
  );
}
