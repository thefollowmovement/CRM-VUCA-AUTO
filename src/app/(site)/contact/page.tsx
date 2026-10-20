import type { Metadata } from "next";
import { Faq } from "@/components/site/blocs";
import { Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { BlocContact } from "@/components/site/sections";
import { etatSite } from "@/server/site/etat";

export const metadata: Metadata = { title: "Contact", description: "Contactez-nous sur WhatsApp, par téléphone ou par email.", alternates: { canonical: "/contact" } };

export default async function PageContact() {
  const { r, maintenance, logo, whatsapp } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;
  return (
    <main>
      <Section className="pt-10 md:pt-16">
        <Conteneur>
          <BlocContact r={r} lienWhatsApp={whatsapp} titre="Contact" niveau={1} />
          {(r.livraison || r.reprise || r.moyensPaiement.length > 0) && (
            <dl className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {r.moyensPaiement.length > 0 && (
                <div>
                  <dt className="s-titre-4">Paiement</dt>
                  <dd className="mt-2 text-site-2">{r.moyensPaiement.join(", ")}</dd>
                </div>
              )}
              {r.livraison && (
                <div>
                  <dt className="s-titre-4">Livraison</dt>
                  <dd className="mt-2 text-site-2">Possible{r.zoneLivraison ? ` : ${r.zoneLivraison}` : ""}.</dd>
                </div>
              )}
              {r.reprise && (
                <div>
                  <dt className="s-titre-4">Reprise</dt>
                  <dd className="mt-2 text-site-2">Nous pouvons reprendre votre véhicule actuel.</dd>
                </div>
              )}
            </dl>
          )}
        </Conteneur>
      </Section>
      {r.faq.length > 0 && (
        <Section fond="gris">
          <Conteneur etroit>
            <EnTeteSection titre="Questions fréquentes" centre />
            <Faq questions={r.faq} />
          </Conteneur>
        </Section>
      )}
    </main>
  );
}
