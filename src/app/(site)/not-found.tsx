import { Bouton } from "@/components/site/bouton";
import { etatSite } from "@/server/site/etat";

/** 404 sobre du site, avec un lien vers les voitures. */
export default async function IntrouvableSite() {
  const { chemins } = await etatSite();
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="s-surtitre mb-3">Erreur 404</p>
      <h1 className="s-titre-1">Page introuvable.</h1>
      <p className="s-intro mt-4">Cette page n&apos;existe pas ou a été déplacée. Cette voiture est peut-être déjà vendue.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Bouton href={chemins.voitures()}>Voir nos voitures</Bouton>
        <Bouton href={chemins.accueil} variante="secondaire">
          Retour à l&apos;accueil
        </Bouton>
      </div>
    </main>
  );
}
