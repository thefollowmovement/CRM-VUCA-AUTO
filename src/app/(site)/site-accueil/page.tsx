import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Apparition } from "@/components/site/apparition";
import { CarteAvis, Etapes, Faq } from "@/components/site/blocs";
import { Bouton } from "@/components/site/bouton";
import { CarteVehicule } from "@/components/site/carte-vehicule";
import { EtatVideSite } from "@/components/site/etat-vide";
import { IconeWhatsApp } from "@/components/site/icones";
import { Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { SceneRoute } from "@/components/site/scene-route";
import { BlocContact, SectionConfiance } from "@/components/site/sections";
import { urlSite } from "@/lib/domaines";
import { budgetsAccueil, decouperTitre, elementsBandeau, prixDepart, TITRE_ACCUEIL_DEFAUT } from "@/lib/site/accueil";
import { jsonLdConcession, serialiserJsonLd } from "@/lib/site/donnees-structurees";
import { ecrireFiltres, FILTRES_VIDES } from "@/lib/site/filtres";
import { kmSite, prixSite } from "@/lib/site/format";
import { sourcePhoto, urlPhoto } from "@/lib/site/photos";
import { etatSite } from "@/server/site/etat";
import { annoncesPubliees, avisPublics, nombreVehiculesVendus, reglagesVendus } from "@/server/site/public";

// Accueil de vuca-auto.fr (servi sur « / » par le middleware).

export const metadata: Metadata = { alternates: { canonical: "/" } };

const nombre = new Intl.NumberFormat("fr-FR");

export default async function AccueilSite() {
  const { r, chemins, maintenance, whatsapp, logo } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;

  const [toutes, avis, vendus] = await Promise.all([annoncesPubliees(), avisPublics(), reglagesVendus()]);
  const nombreVendus = vendus.afficherNombreVendus ? await nombreVehiculesVendus() : 0;
  const total = toutes.length;
  // 6 à 9 cartes (une grille de 3 colonnes toujours complète sur ordinateur)
  const cartes = toutes.length >= 9 ? toutes.slice(0, 9) : toutes.slice(0, 6);
  const enVente = toutes.filter((v) => v.disponibilite !== "VENDU");
  const depart = prixDepart(enVente.map((v) => v.prixCentimes));
  const budgets = budgetsAccueil(enVente.map((v) => v.prixCentimes));
  const derniere = toutes[0];
  const [titre1, titre2] = decouperTitre(r.accueilTitre ?? TITRE_ACCUEIL_DEFAUT);
  const bandeau = elementsBandeau(r.engagements, r.delaiReponse);

  // Fiche entreprise pour Google (AutoDealer) : uniquement des informations publiques
  const jsonLd = jsonLdConcession(r, {
    url: urlSite("/"),
    logo: r.logoClairId ? urlSite(urlPhoto({ id: r.logoClairId }, 400)) : null,
    image: r.imagePartageId ? urlSite(urlPhoto({ id: r.imagePartageId }, 1280)) : urlSite("/partage/site"),
  });

  return (
    <main className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialiserJsonLd(jsonLd) }} />

      {/* Hero : titre géant, appel à l'action, scène animée */}
      <section className="relative pt-10 md:pt-16">
        <div className="s-lumiere pointer-events-none absolute left-1/2 top-[-260px] h-[700px] w-[1100px] max-w-[200vw] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--site-accent)_13%,transparent),transparent)]" aria-hidden />
        <Conteneur className="relative">
          {total > 0 && (
            <p className="s-monte mb-5 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--site-accent)_40%,transparent)] px-3.5 py-1.5 text-[14px] font-semibold text-site-accent">
              <span className="size-2 rounded-full bg-site-accent-fond" aria-hidden />
              {total} voiture{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
            </p>
          )}
          <h1 className="s-geant">
            <span className="s-monte block [animation-delay:80ms]">{titre1}</span>
            {titre2 && <span className="s-monte block text-site-accent [animation-delay:180ms]">{titre2}</span>}
          </h1>
          <div className="s-monte mt-7 flex flex-col gap-6 [animation-delay:300ms] lg:flex-row lg:items-center lg:gap-10">
            <p className="s-intro max-w-[480px]">{r.accueilSousTitre ?? "Des occasions au prix juste, affiché clairement. Une question ? On vous répond directement sur WhatsApp."}</p>
            <div className="flex flex-wrap gap-3">
              <Bouton href={chemins.voitures()} taille="grand">
                Voir les voitures <ArrowRight strokeWidth={2.5} aria-hidden />
              </Bouton>
              {whatsapp && (
                <Bouton href={whatsapp} externe variante="contour" taille="grand">
                  Écrire sur WhatsApp
                </Bouton>
              )}
            </div>
          </div>
          <SceneRoute
            className="mt-10 md:mt-12"
            pastille={depart !== null ? { haut: "Dès", valeur: prixSite(depart), bas: "prix affiché" } : null}
            info={derniere && derniere.disponibilite !== "VENDU" ? { titre: "Dernière arrivée", texte: [derniere.titre, derniere.annee, derniere.kilometrage !== null ? kmSite(derniere.kilometrage) : null].filter(Boolean).join(" · ") } : null}
          />
        </Conteneur>
      </section>

      {/* Bandeau jaune qui défile : uniquement des faits */}
      <div className="mt-14 w-[104%] -translate-x-[2%] -rotate-[1.2deg] overflow-hidden bg-site-accent-fond py-4 text-site-sur-accent md:mt-20">
        <ul className="s-defile flex w-max gap-12 whitespace-nowrap">
          {[0, 1].map((tour) =>
            bandeau.map((texte, i) => (
              <li key={`${tour}-${i}`} className="s-condense flex items-center gap-12 text-[20px] md:text-[26px]" aria-hidden={tour === 1 ? true : undefined}>
                {texte}
                <span aria-hidden>●</span>
              </li>
            )),
          )}
        </ul>
      </div>

      {/* Voitures disponibles */}
      <Section id="voitures">
        <Conteneur>
          <Apparition>
            <EnTeteSection
              titre="En stock"
              accent="maintenant"
              action={
                total > 0 && (
                  <Bouton href={chemins.voitures()} variante="secondaire">
                    Voir toutes les voitures ({total})
                  </Bouton>
                )
              }
            />
          </Apparition>
          {budgets.length > 0 && (
            <nav aria-label="Recherche par budget" className="-mt-4 mb-8 flex items-center gap-2.5 overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-1 md:-mt-6 md:flex-wrap">
              <span className="mr-1 shrink-0 text-[15px] text-site-2">Votre budget :</span>
              {budgets.map((b) => (
                <Link
                  key={b}
                  href={chemins.voitures(ecrireFiltres({ ...FILTRES_VIDES, prixMax: b }))}
                  className="s-transition inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/20 px-4 font-semibold transition-[background-color,color,border-color,transform] hover:-translate-y-0.5 hover:border-transparent hover:bg-site-accent-fond hover:text-site-sur-accent"
                >
                  Moins de {nombre.format(b)} €
                </Link>
              ))}
            </nav>
          )}
          {cartes.length === 0 ? (
            <EtatVideSite titre="De nouvelles voitures arrivent bientôt" texte="Dites-nous ce que vous cherchez : nous vous prévenons dès qu'un véhicule correspond." lienWhatsApp={whatsapp} />
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cartes.map((v, i) => (
                <li key={v.slug}>
                  <Apparition delai={(i % 3) * 90} className="h-full">
                    <CarteVehicule vehicule={v} href={chemins.voiture(v.slug)} photo={v.photos[0] ? sourcePhoto(v.photos[0], chemins.photos) : null} prioritaire={i < 2} className="h-full" />
                  </Apparition>
                </li>
              ))}
            </ul>
          )}
        </Conteneur>
      </Section>

      <SectionConfiance r={r} nombreVendus={vendus.afficherNombreVendus && nombreVendus >= vendus.seuilNombreVendus ? nombreVendus : null} />

      {/* Comment ça se passe */}
      <Section>
        <Conteneur>
          <Apparition>
            <EnTeteSection titre="3 étapes," accent="zéro prise de tête" />
            <Etapes />
          </Apparition>
        </Conteneur>
      </Section>

      {/* Avis clients (réels uniquement) */}
      {avis.length > 0 && (
        <Section fond="gris">
          <Conteneur>
            <EnTeteSection
              titre="Ils nous ont"
              accent="fait confiance"
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
                  <Apparition delai={(i % 3) * 90} className="h-full">
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
        <Section>
          <Conteneur etroit>
            <EnTeteSection titre="Questions" accent="fréquentes" centre />
            <Faq questions={r.faq} />
          </Conteneur>
        </Section>
      )}

      {/* Grand appel à l'action jaune */}
      {whatsapp && (
        <Section className="!py-0">
          <Conteneur>
            <Apparition>
              <div className="flex flex-col gap-8 rounded-[32px] bg-site-accent-fond px-6 py-12 text-site-sur-accent md:flex-row md:items-center md:justify-between md:px-14 md:py-16">
                <h2 className="text-[52px] md:text-[76px]">
                  Une question ?
                  <br />
                  Un message.
                </h2>
                <Bouton href={whatsapp} externe variante="discret" taille="grand" className="s-onde !bg-[#0a0a0b] !text-white">
                  <IconeWhatsApp className="text-whatsapp" /> Écrire sur WhatsApp
                </Bouton>
              </div>
            </Apparition>
          </Conteneur>
        </Section>
      )}

      {/* Contact */}
      <Section id="contact">
        <Conteneur>
          <BlocContact r={r} lienWhatsApp={whatsapp} titre={whatsapp ? "Nous contacter" : undefined} />
        </Conteneur>
      </Section>
    </main>
  );
}
