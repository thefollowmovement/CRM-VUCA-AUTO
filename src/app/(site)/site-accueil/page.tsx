import { Apparition } from "@/components/site/apparition";
import { CarteAvis, Engagements, Etapes, Faq } from "@/components/site/blocs";
import { Bouton } from "@/components/site/bouton";
import { CarteVehicule } from "@/components/site/carte-vehicule";
import { EtatVideSite } from "@/components/site/etat-vide";
import { Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { BlocContact, SectionConfiance } from "@/components/site/sections";
import { sourcePhoto } from "@/lib/site/photos";
import { etatSite } from "@/server/site/etat";
import { annoncesPubliees, avisPublics, nombreAnnoncesPubliees, nombreVehiculesVendus, reglagesVendus } from "@/server/site/public";

// Accueil de vuca-auto.fr (servi sur « / » par le middleware).

export default async function AccueilSite() {
  const { r, chemins, maintenance, logo, whatsapp } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;

  const [dernieres, total, avis, vendus] = await Promise.all([annoncesPubliees(9), nombreAnnoncesPubliees(), avisPublics(), reglagesVendus()]);
  const nombreVendus = vendus.afficherNombreVendus ? await nombreVehiculesVendus() : 0;
  // 6 à 9 cartes (une grille de 3 colonnes toujours complète sur ordinateur)
  const cartes = dernieres.length >= 9 ? dernieres : dernieres.slice(0, 6);

  return (
    <main>
      {/* Hero */}
      <Section className="pb-12 pt-14 md:pb-16 md:pt-24">
        <Conteneur className="flex flex-col items-center text-center">
          {r.slogan && r.accueilTitre && <p className="s-surtitre mb-3">{r.slogan}</p>}
          <h1 className="s-titre-1 max-w-[860px]">{r.accueilTitre ?? r.slogan ?? "Des voitures d'occasion choisies avec soin."}</h1>
          <p className="s-intro mt-5 max-w-[640px]">{r.accueilSousTitre ?? "Photos réelles, prix clairs, historique transparent. Une question ? Écrivez-nous directement sur WhatsApp."}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Bouton href={chemins.voitures()} taille="grand">
              Voir les voitures
            </Bouton>
            {whatsapp && (
              <Bouton href={whatsapp} externe variante="whatsapp" taille="grand">
                Écrire sur WhatsApp
              </Bouton>
            )}
          </div>
        </Conteneur>
        {r.engagements.length > 0 && (
          <Conteneur className="mt-14 border-t border-site-sep pt-10">
            <Engagements engagements={r.engagements.slice(0, 3)} bande />
          </Conteneur>
        )}
      </Section>

      {/* Voitures disponibles */}
      <Section fond="gris" id="voitures">
        <Conteneur>
          <Apparition>
            <EnTeteSection
              titre="Voitures disponibles"
              intro="Les dernières arrivées."
              action={
                total > 0 && (
                  <Bouton href={chemins.voitures()} variante="secondaire">
                    Voir toutes les voitures ({total})
                  </Bouton>
                )
              }
            />
          </Apparition>
          {cartes.length === 0 ? (
            <EtatVideSite titre="De nouvelles voitures arrivent bientôt" texte="Dites-nous ce que vous cherchez : nous vous prévenons dès qu'un véhicule correspond." lienWhatsApp={whatsapp} />
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cartes.map((v, i) => (
                <li key={v.slug}>
                  <Apparition delai={(i % 3) * 80} className="h-full">
                    <CarteVehicule vehicule={v} href={chemins.voiture(v.slug)} photo={v.photos[0] ? sourcePhoto(v.photos[0], chemins.photos) : null} prioritaire={i < 2} className="h-full" />
                  </Apparition>
                </li>
              ))}
            </ul>
          )}
        </Conteneur>
      </Section>

      <SectionConfiance r={r} nombreVendus={vendus.afficherNombreVendus && nombreVendus >= vendus.seuilNombreVendus ? nombreVendus : null} fond="blanc" />

      {/* Comment ça se passe */}
      <Section fond="gris">
        <Conteneur>
          <Apparition>
            <EnTeteSection titre="Comment ça se passe" centre />
            <Etapes />
          </Apparition>
        </Conteneur>
      </Section>

      {/* Avis clients (réels uniquement) */}
      {avis.length > 0 && (
        <Section>
          <Conteneur>
            <EnTeteSection
              titre="Ils nous ont fait confiance"
              action={
                r.lienAvisGoogle && (
                  <Bouton href={r.lienAvisGoogle} externe variante="secondaire">
                    Voir tous nos avis sur Google
                  </Bouton>
                )
              }
            />
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {avis.slice(0, 6).map((a, i) => (
                <li key={i}>
                  <Apparition delai={(i % 3) * 80} className="h-full">
                    <CarteAvis avis={a} />
                  </Apparition>
                </li>
              ))}
            </ul>
          </Conteneur>
        </Section>
      )}

      {/* FAQ */}
      {r.faq.length > 0 && (
        <Section fond={avis.length > 0 ? "gris" : "blanc"}>
          <Conteneur etroit>
            <EnTeteSection titre="Questions fréquentes" centre />
            <Faq questions={r.faq} />
          </Conteneur>
        </Section>
      )}

      {/* Contact */}
      <Section id="contact">
        <Conteneur>
          <BlocContact r={r} lienWhatsApp={whatsapp} />
        </Conteneur>
      </Section>
    </main>
  );
}
