import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Fuel, Gauge, Leaf, Palette, Phone, Settings2, Users, Wrench, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bouton } from "@/components/site/bouton";
import { CarteVehicule } from "@/components/site/carte-vehicule";
import { Badge, Prix } from "@/components/site/elements";
import { Galerie, type PhotoGalerie } from "@/components/site/galerie";
import { Conteneur, EnTeteSection, Section } from "@/components/site/mise-en-page";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { Partager } from "@/components/site/partager";
import { TexteRiche } from "@/components/site/texte-riche";
import { GrilleTuiles, Tuile } from "@/components/site/tuile";
import { BarreVehiculeMobile } from "@/components/site/whatsapp";
import { urlAnnonce } from "@/lib/domaines";
import { CATEGORIES_EQUIPEMENTS, ORDRE_CATEGORIES } from "@/lib/site/equipements";
import { kmSite, prixSite } from "@/lib/site/format";
import { sourcePhoto, urlPhoto } from "@/lib/site/photos";
import { vehiculesSimilaires } from "@/lib/site/similaires";
import type { VehiculePublic } from "@/lib/site/vehicule-public";
import { lienWhatsApp, remplirMessage } from "@/lib/site/whatsapp";
import { etatSite } from "@/server/site/etat";
import { annonceParSlug, annoncesPubliees } from "@/server/site/public";

type Props = { params: Promise<{ slug: string }> };

/** « Peugeot 208 Allure 2021 – 84 500 km – 12 490 € » (le nom du site est ajouté par le layout). */
function titrePage(v: VehiculePublic) {
  return [`${v.titre}${v.annee && !v.titre.includes(String(v.annee)) ? ` ${v.annee}` : ""}`, v.kilometrage !== null ? kmSite(v.kilometrage) : null, v.disponibilite === "VENDU" ? "Vendu" : prixSite(v.prixCentimes)]
    .filter(Boolean)
    .join(" – ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // En maintenance, rien du véhicule ne doit apparaître (pas même dans le titre de l'onglet)
  if ((await etatSite()).maintenance) return {};
  const v = await annonceParSlug((await params).slug);
  if (!v) return { title: "Véhicule introuvable" };
  return {
    title: titrePage(v),
    description: [v.titre, v.annee, v.kilometrage !== null ? kmSite(v.kilometrage) : null, v.carburant, v.boite].filter(Boolean).join(" · "),
    alternates: { canonical: `/voitures/${v.slug}` },
  };
}

const dateParis = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/** Fiche d'un véhicule : galerie, prix, caractéristiques, confiance, description, équipements, contact. */
export default async function FicheVoiture({ params }: Props) {
  const { r, chemins, maintenance, logo, whatsapp, photoVendeur } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;
  const v = await annonceParSlug((await params).slug);
  if (!v) notFound();

  const vendu = v.disponibilite === "VENDU";
  const adresse = urlAnnonce(v.slug);
  const message = remplirMessage(r.messageWhatsappVehicule, {
    marque: v.marque, modele: v.modele, version: v.version, annee: v.annee,
    km: v.kilometrage !== null ? kmSite(v.kilometrage) : null,
    prix: v.prixCentimes !== null ? prixSite(v.prixCentimes) : null,
    lien: adresse,
  });
  const whatsappVehicule = vendu ? null : lienWhatsApp(r.whatsapp, message);
  const telephone = r.telephone;
  const photos: PhotoGalerie[] = v.photos.map((p) => ({ ...sourcePhoto(p, chemins.photos), alt: p.alt, miniature: urlPhoto(p, 400, chemins.photos) }));
  const similaires = vehiculesSimilaires(v, await annoncesPubliees());
  const equipements: { libelle: string; items: string[] }[] = [
    ...ORDRE_CATEGORIES.map((c) => ({ libelle: CATEGORIES_EQUIPEMENTS[c].libelle as string, items: v.equipements[c] })),
    { libelle: "Autres équipements", items: v.equipements.autres },
  ].filter((c) => c.items.length > 0);
  const garantie = v.confiance.find((c) => c.cle === "garantie");

  return (
    <main className={vendu ? undefined : "max-md:pb-24"}>
      {vendu && (
        <div className="bg-site-vendu-fond text-site-texte" role="status">
          <Conteneur className="flex flex-col items-start gap-3 py-5 md:flex-row md:items-center md:justify-between">
            <p className="text-[17px] font-semibold">Ce véhicule a été vendu.</p>
            <Bouton href={chemins.voitures()} variante="secondaire" className="!px-0">
              Voir nos voitures disponibles
            </Bouton>
          </Conteneur>
        </div>
      )}

      <Section className="pb-12 pt-6 md:pb-20 md:pt-10">
        <Conteneur>
          <Link href={chemins.voitures()} className="s-petit mb-5 inline-flex min-h-11 items-center gap-1 text-site-accent hover:underline">
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden /> Nos voitures
          </Link>
          <TitreFiche v={v} />
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Colonne principale */}
            <div className="flex min-w-0 flex-col gap-10">
              <Galerie photos={photos} titre={v.titre} />

              <section aria-labelledby="caracteristiques">
                <h2 id="caracteristiques" className="s-titre-3 mb-5">Caractéristiques</h2>
                <GrilleTuiles>
                  {v.annee && <Tuile icone={CalendarDays} libelle="Année" valeur={v.annee} />}
                  {v.kilometrage !== null && <Tuile icone={Gauge} libelle="Kilométrage" valeur={kmSite(v.kilometrage)} />}
                  {v.carburant && <Tuile icone={Fuel} libelle="Carburant" valeur={v.carburant} />}
                  {v.boite && <Tuile icone={Settings2} libelle="Boîte" valeur={v.boite} />}
                  {v.puissanceCh && <Tuile icone={Zap} libelle="Puissance" valeur={`${v.puissanceCh} ch`} />}
                  {v.critAir && <Tuile icone={Leaf} libelle="Crit'Air" valeur={v.critAir.replace(/^Crit'Air\s*/i, "")} />}
                  {v.places && <Tuile icone={Users} libelle="Places" valeur={v.places} />}
                  {v.couleur && <Tuile icone={Palette} libelle="Couleur" valeur={v.couleur} />}
                </GrilleTuiles>
                {v.immatriculation && <p className="s-petit mt-3 text-site-2">Immatriculation : {v.immatriculation}</p>}
              </section>

              {v.confiance.length > 0 && (
                <section aria-labelledby="confiance">
                  <h2 id="confiance" className="s-titre-3 mb-5">Ce qui a été vérifié</h2>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {v.confiance.map((c) => (
                      <li key={c.cle} className="flex gap-3 rounded-tuile bg-site-fond-alt p-4">
                        <CircleCheck className="mt-0.5 size-5 shrink-0 text-site-accent" strokeWidth={1.75} aria-hidden />
                        <div className="min-w-0">
                          <p className="font-semibold">{c.libelle}</p>
                          {c.detail && <p className="s-petit text-site-2">{c.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {v.description && (
                <section aria-labelledby="description">
                  <h2 id="description" className="s-titre-3 mb-5">Description</h2>
                  <TexteRiche texte={v.description} className="max-w-[68ch] text-[17px]" />
                </section>
              )}

              {equipements.length > 0 && (
                <section aria-labelledby="equipements">
                  <h2 id="equipements" className="s-titre-3 mb-5">Équipements</h2>
                  <div className="divide-y divide-site-sep border-y border-site-sep">
                    {equipements.map((c, i) => (
                      <details key={c.libelle} open={i === 0}>
                        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 text-[17px] font-semibold">
                          <span>
                            {c.libelle} <span className="font-normal text-site-2">({c.items.length})</span>
                          </span>
                          <ChevronRight className="s-chevron s-transition size-5 shrink-0 text-site-2 transition-transform" strokeWidth={1.75} aria-hidden />
                        </summary>
                        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 pb-5 sm:grid-cols-2">
                          {c.items.map((item) => (
                            <li key={item} className="flex items-center gap-2">
                              <CircleCheck className="size-4 shrink-0 text-site-2" strokeWidth={1.5} aria-hidden /> {item}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {v.travauxRealises && (
                <section aria-labelledby="travaux">
                  <h2 id="travaux" className="s-titre-3 mb-5">Travaux réalisés</h2>
                  <p className="flex gap-3 whitespace-pre-line rounded-tuile bg-site-fond-alt p-4">
                    <Wrench className="mt-0.5 size-5 shrink-0 text-site-2" strokeWidth={1.5} aria-hidden /> {v.travauxRealises}
                  </p>
                </section>
              )}

              <p className="s-petit text-site-2">
                Annonce mise à jour le {dateParis(v.misAJourLe)} · Réf. {v.reference}
              </p>
            </div>

            {/* Colonne de droite (ordinateur) : prix, contact, collante */}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:h-fit">
              <div className="flex flex-col gap-3 rounded-carte bg-site-carte p-6 shadow-site">
                {!vendu && <Prix centimes={v.prixCentimes} negociable={v.prixNegociable} className="hidden lg:flex" />}
                {whatsappVehicule && (
                  <Bouton href={whatsappVehicule} externe variante="whatsapp" taille="grand" pleineLargeur>
                    Écrire sur WhatsApp
                  </Bouton>
                )}
                {!vendu && telephone && (
                  <Bouton href={`tel:${telephone.replace(/[^\d+]/g, "")}`} variante="contour" pleineLargeur>
                    <Phone strokeWidth={1.5} aria-hidden /> Appeler
                  </Bouton>
                )}
                <Partager titre={v.titre} url={adresse} className="w-full" />
                {garantie && !vendu && <p className="s-petit text-center text-site-2">{garantie.libelle}{garantie.detail ? ` — ${garantie.detail}` : ""}</p>}
              </div>
              {!vendu && (
                <div className="flex items-center gap-4 rounded-carte bg-site-fond-alt p-6">
                  {photoVendeur && (
                    <img src={photoVendeur} alt={r.vendeurNom ?? "Votre interlocuteur"} className="size-14 shrink-0 rounded-full object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">Vous avez une question ?</p>
                    <p className="s-petit text-site-2">
                      {r.vendeurNom ? `${r.vendeurNom} vous répond` : "Nous vous répondons"}
                      {r.delaiReponse ? ` — ${r.delaiReponse.charAt(0).toLowerCase()}${r.delaiReponse.slice(1)}` : ""}.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </Conteneur>
      </Section>

      {similaires.length > 0 && (
        <Section fond="gris">
          <Conteneur>
            <EnTeteSection
              titre={vendu ? "Ces voitures pourraient vous plaire" : "Véhicules similaires"}
              action={
                <Bouton href={chemins.voitures()} variante="secondaire">
                  Voir toutes les voitures
                </Bouton>
              }
            />
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similaires.map((s) => (
                <li key={s.slug}>
                  <CarteVehicule vehicule={s} href={chemins.voiture(s.slug)} photo={s.photos[0] ? sourcePhoto(s.photos[0], chemins.photos) : null} className="h-full" />
                </li>
              ))}
            </ul>
          </Conteneur>
        </Section>
      )}

      {!vendu && <BarreVehiculeMobile prixCentimes={v.prixCentimes} negociable={v.prixNegociable} lienWhatsApp={whatsappVehicule} telephone={telephone} />}
    </main>
  );
}

/** En-tête de la fiche : badges, marque et modèle, version, prix. */
function TitreFiche({ v }: { v: VehiculePublic }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {v.disponibilite !== "DISPONIBLE" && (
          <div className="mb-3 flex flex-wrap gap-2">
            {v.disponibilite === "RESERVE" && <Badge ton="reserve">Réservé</Badge>}
            {v.disponibilite === "VENDU" && <Badge ton="vendu">Vendu</Badge>}
          </div>
        )}
        <h1 className="s-titre-1">
          {v.marque} {v.modele}
        </h1>
        {(v.version || v.annee) && <p className="s-intro mt-2">{[v.version, v.annee].filter(Boolean).join(" · ")}</p>}
      </div>
      {v.disponibilite !== "VENDU" && <Prix centimes={v.prixCentimes} negociable={v.prixNegociable} taille="grand" className="shrink-0" />}
    </div>
  );
}
