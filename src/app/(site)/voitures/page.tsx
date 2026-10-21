import type { Metadata } from "next";
import { Bouton } from "@/components/site/bouton";
import { CarteVehicule } from "@/components/site/carte-vehicule";
import { EtatVideSite } from "@/components/site/etat-vide";
import { FiltresVoitures } from "@/components/site/filtres-voitures";
import { Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { appliquerFiltres, ecrireFiltres, FILTRES_VIDES, lireFiltres, nombreFiltresActifs, optionsFiltres } from "@/lib/site/filtres";
import { sourcePhoto } from "@/lib/site/photos";
import { etatSite } from "@/server/site/etat";
import { annoncesPubliees, annoncesVenduesRecemment, reglagesVendus } from "@/server/site/public";

export const metadata: Metadata = {
  title: "Nos voitures d'occasion",
  description: "Toutes nos voitures d'occasion disponibles : photos, caractéristiques, prix. Contact direct sur WhatsApp.",
  alternates: { canonical: "/voitures" },
};

/** Liste des voitures en ligne : filtres et tri gardés dans l'adresse. */
export default async function PageVoitures({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { r, chemins, maintenance, logo, whatsapp } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;

  const filtres = lireFiltres(await searchParams);
  const [toutes, vendus] = await Promise.all([annoncesPubliees(), reglagesVendus()]);
  const resultats = appliquerFiltres(toutes, filtres);
  const vendusRecemment = vendus.afficherVendus ? await annoncesVenduesRecemment(vendus.joursVendus) : [];
  const filtre = nombreFiltresActifs(filtres) > 0;

  return (
    <main>
      <Section className="pb-10 pt-10 md:pb-12 md:pt-16">
        <Conteneur>
          <EnTeteSection
            niveau={1}
            titre="Nos"
            accent="voitures"
            intro={`${toutes.length} voiture${toutes.length > 1 ? "s" : ""} disponible${toutes.length > 1 ? "s" : ""}, photos réelles et prix affichés.`}
          />
          {toutes.length > 0 && <FiltresVoitures filtres={filtres} options={optionsFiltres(toutes)} nombreResultats={resultats.length} chemin={chemins.voitures()} />}
        </Conteneur>
      </Section>
      <Section fond="gris" className="pt-10 md:pt-12">
        <Conteneur>
          {resultats.length === 0 ? (
            <EtatVideSite
              titre={filtre ? "Aucune voiture ne correspond" : "De nouvelles voitures arrivent bientôt"}
              texte={
                filtre
                  ? "Essayez d'élargir vos critères, ou dites-nous ce que vous cherchez : nous vous prévenons dès qu'un véhicule correspond."
                  : "Dites-nous ce que vous cherchez : nous vous prévenons dès qu'un véhicule correspond."
              }
              lienWhatsApp={whatsapp}
              action={
                filtre && (
                  <Bouton href={chemins.voitures(ecrireFiltres({ ...FILTRES_VIDES, tri: filtres.tri }))} variante="contour">
                    Effacer les filtres
                  </Bouton>
                )
              }
            />
          ) : (
            <>
              {/* Titre pour les lecteurs d'écran : les cartes (h3) restent dans l'ordre des titres */}
              <h2 className="sr-only">Résultats</h2>
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {resultats.map((v, i) => (
                  <li key={v.slug}>
                    <CarteVehicule vehicule={v} href={chemins.voiture(v.slug)} photo={v.photos[0] ? sourcePhoto(v.photos[0], chemins.photos) : null} prioritaire={i < 2} className="h-full" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Conteneur>
      </Section>
      {vendusRecemment.length > 0 && (
        <Section>
          <Conteneur>
            <EnTeteSection titre="Récemment" accent="vendues" intro="Elles ont déjà trouvé preneur." />
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vendusRecemment.map((v) => (
                <li key={v.slug}>
                  <CarteVehicule vehicule={v} href={chemins.voiture(v.slug)} photo={v.photos[0] ? sourcePhoto(v.photos[0], chemins.photos) : null} className="h-full" />
                </li>
              ))}
            </ul>
          </Conteneur>
        </Section>
      )}
    </main>
  );
}
