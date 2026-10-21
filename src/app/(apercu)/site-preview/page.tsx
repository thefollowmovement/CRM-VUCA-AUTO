import { ArrowLeft, CalendarDays, Car, Fuel, Gauge, Leaf, MapPin, Palette, Phone, Settings2, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Apparition } from "@/components/site/apparition";
import { DemoFiltres } from "@/components/site/apercu/demo-interactive";
import { CarteAvis, Engagements, Etapes, Faq, Horaires } from "@/components/site/blocs";
import { Bouton } from "@/components/site/bouton";
import { CarteVehicule } from "@/components/site/carte-vehicule";
import { Badge, PhotoSite, Prix } from "@/components/site/elements";
import { EtatVideSite } from "@/components/site/etat-vide";
import { Bandeau, Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import type { LogoSite } from "@/components/site/logo";
import { NavigationSite } from "@/components/site/navigation-site";
import { PiedDePage } from "@/components/site/pied-de-page";
import { GrilleTuiles, Tuile } from "@/components/site/tuile";
import { BarreVehiculeMobile, WhatsappFlottant } from "@/components/site/whatsapp";
import { urlSite } from "@/lib/domaines";
import { kmSite } from "@/lib/site/format";
import type { SourcePhoto } from "@/lib/site/photos";
import { ENGAGEMENTS_PROPOSES } from "@/lib/site/reglages-defaut";
import { lienWhatsApp } from "@/lib/site/whatsapp";
import { annoncesPubliees, avisPublics, nombreAnnoncesPubliees, reglagesPublics } from "@/server/site/public";

// Dans l'aperçu (CRM), les photos passent par la route protégée du CRM ; sur le site, par /photos (Phase S3).
const photoCrm = (id: string | undefined): SourcePhoto | null => (id ? { src: `/api/fichiers/${id}` } : null);
const imageCrm = (id: string | null) => (id ? `/api/fichiers/${id}` : null);

const PALETTE = [
  { nom: "Fond (nuit)", variable: "--site-fond", valeur: "#0A0A0B" },
  { nom: "Cartes", variable: "--site-carte", valeur: "#141416" },
  { nom: "Texte", variable: "--site-texte", valeur: "#F5F5F7" },
  { nom: "Texte secondaire", variable: "--site-texte-2", valeur: "#A1A1A6" },
  { nom: "Séparateurs", variable: "--site-separateur", valeur: "#2A2A2E" },
  { nom: "Accent (réglable, jaune par défaut)", variable: "--site-accent", valeur: "Site web → Général" },
  { nom: "WhatsApp", variable: "--site-whatsapp", valeur: "#25D366" },
];

function Exemple({ children }: { children: React.ReactNode }) {
  return <p className="s-petit mb-4 inline-flex rounded-full bg-site-reserve-fond px-3 py-1 font-medium text-site-reserve">{children}</p>;
}

/** Page de démonstration des composants du site (validation du style, Phase S2). */
export default async function PageApercuSite() {
  const [r, vehicules, total, avis] = await Promise.all([reglagesPublics(), annoncesPubliees(6), nombreAnnoncesPubliees(), avisPublics()]);
  const whatsapp = lienWhatsApp(r.whatsapp, r.messageWhatsappGeneral);
  const logo: LogoSite = { nom: r.nom, clair: imageCrm(r.logoClairId), fonce: imageCrm(r.logoFonceId) };
  const engagements = r.engagements.length ? r.engagements : ENGAGEMENTS_PROPOSES.slice(0, 3);
  const premier = vehicules[0];
  const marques = [...new Set(vehicules.map((v) => v.marque))].sort();
  // Liens de navigation : vers le vrai site public (https://vuca-auto.fr/…)
  const baseSite = urlSite("/").replace(/\/$/, "");

  return (
    <>
      {/* Barre propre à l'aperçu (n'existe pas sur le site) */}
      <div className="bg-[#1d1d1f] text-white">
        <Conteneur className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/site-web" className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium">
            <ArrowLeft className="size-4" aria-hidden /> Retour au CRM
          </Link>
          <p className="text-[14px] text-white/70">Aperçu du style du site — visible uniquement dans le CRM</p>
        </Conteneur>
      </div>

      <Bandeau texte={r.bandeau ?? "Exemple de bandeau d'information (réglage « Bandeau » dans Site web → Contenu)."} />
      <NavigationSite logo={logo} lienWhatsApp={whatsapp} accueil="/site-preview" base={baseSite} />

      <main>
        {/* Hero */}
        <Section className="pb-12 pt-14 md:pb-16 md:pt-24">
          <Conteneur className="flex flex-col items-center text-center">
            {r.slogan && <p className="s-surtitre mb-3">{r.slogan}</p>}
            <h1 className="s-titre-1 max-w-[860px]">{r.accueilTitre ?? "Des voitures d'occasion choisies avec soin."}</h1>
            <p className="s-intro mt-5 max-w-[640px]">{r.accueilSousTitre ?? "Photos réelles, prix clairs, historique transparent. Une question ? Écrivez-nous directement sur WhatsApp."}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Bouton href="#voitures" taille="grand">
                Voir les voitures
              </Bouton>
              {whatsapp && (
                <Bouton href={whatsapp} externe variante="whatsapp" taille="grand">
                  Écrire sur WhatsApp
                </Bouton>
              )}
            </div>
          </Conteneur>
          <Conteneur className="mt-14 border-t border-site-sep pt-10">
            {!r.engagements.length && <Exemple>Exemple : aucun engagement n&apos;est activé dans Site web → Confiance</Exemple>}
            <Engagements engagements={engagements} bande />
          </Conteneur>
        </Section>

        {/* Cartes véhicules (vraies annonces de démo) */}
        <Section fond="gris" id="voitures">
          <Conteneur>
            <Apparition>
              <EnTeteSection
                titre="Voitures disponibles"
                intro="Les dernières arrivées."
                action={
                  <Bouton href="#voitures" variante="secondaire">
                    Voir toutes les voitures ({total})
                  </Bouton>
                }
              />
            </Apparition>
            {vehicules.length === 0 ? (
              <EtatVideSite titre="Aucune annonce publiée" texte="Publiez une annonce depuis l'onglet « Annonce » d'un véhicule pour la voir ici." />
            ) : (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {vehicules.map((v, i) => (
                  <li key={v.slug}>
                    <Apparition delai={(i % 3) * 80} className="h-full">
                      <CarteVehicule vehicule={v} href="#voitures" photo={photoCrm(v.photos[0]?.id)} prioritaire={i < 3} className="h-full" />
                    </Apparition>
                  </li>
                ))}
              </ul>
            )}
          </Conteneur>
        </Section>

        {/* Typographie, couleurs, boutons, badges */}
        <Section>
          <Conteneur>
            <EnTeteSection surtitre="Système de design" titre="Typographie et couleurs" intro="Titres en Archivo condensé très gras (majuscules), texte courant en Inter. Les deux polices sont hébergées sur le site." />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <p className="s-titre-1">Titre 56</p>
                <p className="s-titre-2">Titre 40</p>
                <p className="s-titre-3">Titre 28</p>
                <p className="s-titre-4">Titre 21</p>
                <p className="s-corps">Texte courant 17 px, interligne 1,5 : lisible, aéré, sans fioriture.</p>
                <p className="s-petit text-site-2">Texte secondaire 14 px — légendes, mentions.</p>
                <p className="s-chiffres text-[21px] font-semibold">12 490 € · 84 500 km · 2021</p>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PALETTE.map((c) => (
                  <li key={c.nom} className="overflow-hidden rounded-tuile border border-site-sep">
                    <div className="h-16" style={{ background: `var(${c.variable})` }} />
                    <div className="p-3">
                      <p className="s-petit font-semibold">{c.nom}</p>
                      <p className="text-[12px] text-site-2">{c.valeur}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="s-titre-3 mb-6 mt-16">Boutons</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Bouton>Voir les voitures</Bouton>
              <Bouton variante="whatsapp">Écrire sur WhatsApp</Bouton>
              <Bouton variante="contour">
                <Phone strokeWidth={1.5} aria-hidden /> Appeler
              </Bouton>
              <Bouton variante="discret">Partager</Bouton>
              <Bouton variante="secondaire">En savoir plus</Bouton>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Bouton taille="grand">Grand</Bouton>
              <Bouton taille="compact">Compact</Bouton>
              <Bouton variante="whatsapp" taille="compact">
                WhatsApp
              </Bouton>
              <Bouton disabled>Désactivé</Bouton>
            </div>

            <h3 className="s-titre-3 mb-6 mt-16">Badges et prix</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge ton="reserve">Réservé</Badge>
              <Badge ton="vendu">Vendu</Badge>
              <Badge>Garantie 6 mois</Badge>
              <Badge>Première main</Badge>
              <Badge ton="accent">Nouveau</Badge>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-10">
              <Prix centimes={1249000} taille="grand" negociable />
              <Prix centimes={899000} />
              <Prix centimes={null} />
            </div>
          </Conteneur>
        </Section>

        {/* Filtres et tri */}
        <Section fond="gris">
          <Conteneur>
            <EnTeteSection surtitre="Liste des voitures" titre="Filtres et tri" intro="Sur téléphone, les filtres s'ouvrent dans une feuille du bas." />
            <DemoFiltres marques={marques} />
            <div className="mt-10">
              <EtatVideSite titre="Aucune voiture ne correspond" texte="Essayez d'élargir vos critères, ou dites-nous ce que vous cherchez : nous vous prévenons dès qu'un véhicule correspond." lienWhatsApp={whatsapp} />
            </div>
          </Conteneur>
        </Section>

        {/* Fiche véhicule */}
        {premier && (
          <Section>
            <Conteneur>
              <EnTeteSection surtitre="Fiche véhicule" titre={premier.titre} />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex flex-col gap-8">
                  <PhotoSite photo={photoCrm(premier.photos[0]?.id)} alt={premier.photos[0]?.alt ?? premier.titre} sizes="(min-width: 1024px) 760px, 100vw" />
                  <GrilleTuiles>
                    {premier.annee && <Tuile icone={CalendarDays} libelle="Année" valeur={premier.annee} />}
                    {premier.kilometrage !== null && <Tuile icone={Gauge} libelle="Kilométrage" valeur={kmSite(premier.kilometrage)} />}
                    {premier.carburant && <Tuile icone={Fuel} libelle="Carburant" valeur={premier.carburant} />}
                    {premier.boite && <Tuile icone={Settings2} libelle="Boîte" valeur={premier.boite} />}
                    {premier.puissanceCh && <Tuile icone={Zap} libelle="Puissance" valeur={`${premier.puissanceCh} ch`} />}
                    {premier.critAir && <Tuile icone={Leaf} libelle="Crit'Air" valeur={premier.critAir} />}
                    {premier.places && <Tuile icone={Users} libelle="Places" valeur={premier.places} />}
                    {premier.couleur && <Tuile icone={Palette} libelle="Couleur" valeur={premier.couleur} />}
                  </GrilleTuiles>
                  {premier.confiance.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {premier.confiance.map((c) => (
                        <li key={c.cle}>
                          <Badge className="bg-site-fond-alt shadow-none">{c.libelle}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <aside className="flex h-fit flex-col gap-5 rounded-carte bg-site-carte p-6 shadow-site lg:sticky lg:top-20">
                  <div>
                    <p className="s-petit text-site-2">{premier.version}</p>
                    <Prix centimes={premier.prixCentimes} negociable={premier.prixNegociable} taille="grand" />
                  </div>
                  {whatsapp && (
                    <Bouton href={whatsapp} externe variante="whatsapp" pleineLargeur taille="grand">
                      Écrire sur WhatsApp
                    </Bouton>
                  )}
                  {r.telephone && (
                    <Bouton href={`tel:${r.telephone}`} variante="contour" pleineLargeur>
                      <Phone strokeWidth={1.5} aria-hidden /> Appeler
                    </Bouton>
                  )}
                  <p className="s-petit text-site-2">{r.delaiReponse ?? "Réponse rapide en journée"}</p>
                </aside>
              </div>
              <div className="mx-auto mt-12 max-w-[420px]">
                <p className="s-petit mb-2 text-center text-site-2">Barre collante en bas de l&apos;écran sur téléphone :</p>
                <BarreVehiculeMobile apercu prixCentimes={premier.prixCentimes} negociable={premier.prixNegociable} lienWhatsApp={whatsapp} telephone={r.telephone} />
              </div>
            </Conteneur>
          </Section>
        )}

        {/* Comment ça se passe */}
        <Section fond="gris">
          <Conteneur>
            <EnTeteSection titre="Comment ça se passe" centre />
            <Etapes />
          </Conteneur>
        </Section>

        {/* Avis */}
        <Section>
          <Conteneur>
            <EnTeteSection titre="Ils nous ont fait confiance" />
            {avis.length === 0 && <Exemple>Mise en page d&apos;exemple : aucun avis réel n&apos;est saisi, cette section n&apos;apparaîtra pas sur le site</Exemple>}
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {(avis.length
                ? avis.slice(0, 3)
                : [{ auteur: "Prénom N.", note: 5, texte: "Exemple de texte : il sera remplacé par les avis réels que vous ajouterez dans Site web → Avis clients.", date: "mois année", vehiculeAchete: null, source: "Google" }]
              ).map((a, i) => (
                <li key={i}>
                  <CarteAvis avis={a} />
                </li>
              ))}
            </ul>
          </Conteneur>
        </Section>

        {/* FAQ */}
        <Section fond="gris">
          <Conteneur etroit>
            <EnTeteSection titre="Questions fréquentes" centre />
            {r.faq.length === 0 && <Exemple>Exemple : ajoutez vos questions dans Site web → Contenu</Exemple>}
            <Faq
              questions={
                r.faq.length
                  ? r.faq
                  : [
                      { question: "Exemple de question ?", reponse: "Exemple de réponse : elle s'ouvre et se ferme d'un toucher." },
                      { question: "Deuxième question d'exemple ?", reponse: "Le texte de la réponse s'affiche ici." },
                    ]
              }
            />
          </Conteneur>
        </Section>

        {/* Contact */}
        <Section>
          <Conteneur>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-10 rounded-carte bg-site-fond-alt p-6 md:grid-cols-2 md:p-10">
              <div className="flex flex-col gap-4">
                <h2 className="s-titre-2">Une question ?</h2>
                <p className="s-intro">Le plus simple : écrivez-nous sur WhatsApp.</p>
                <div className="flex flex-wrap gap-3">
                  {whatsapp && (
                    <Bouton href={whatsapp} externe variante="whatsapp">
                      Écrire sur WhatsApp
                    </Bouton>
                  )}
                  {r.telephone && (
                    <Bouton href={`tel:${r.telephone}`} variante="contour">
                      <Phone strokeWidth={1.5} aria-hidden /> {r.telephone}
                    </Bouton>
                  )}
                </div>
                {r.adresse && (
                  <p className="flex items-start gap-2 text-site-2">
                    <MapPin className="mt-1 size-5 shrink-0" strokeWidth={1.5} aria-hidden /> <span className="whitespace-pre-line">{r.adresse}</span>
                  </p>
                )}
              </div>
              <div>
                <h3 className="s-titre-4 mb-4">Horaires</h3>
                <Horaires horaires={r.horaires} />
                {!r.horaires.some((h) => h.ouvert) && <p className="text-site-2">Renseignez vos horaires dans Site web → Contact.</p>}
              </div>
            </div>
          </Conteneur>
        </Section>

        <Section fond="gris" className="py-10 md:py-12">
          <Conteneur className="flex items-center gap-3 text-site-2">
            <Car className="size-5" strokeWidth={1.5} aria-hidden />
            <p className="s-petit">Icônes fines (trait 1,5), transitions de 250 ms, apparition douce au défilement — désactivées si l&apos;appareil demande de réduire les animations.</p>
          </Conteneur>
        </Section>
      </main>

      <PiedDePage
        base={baseSite}
        infos={{ logo, slogan: r.slogan, formeJuridique: r.formeJuridique, siret: r.siret, adresse: r.adresse, telephone: r.telephone, email: r.email, reseaux: r.reseaux }}
      />
      {whatsapp && <WhatsappFlottant lien={whatsapp} />}
    </>
  );
}
