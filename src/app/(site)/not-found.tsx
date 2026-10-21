import { Bouton } from "@/components/site/bouton";
import { etatSite } from "@/server/site/etat";

/** 404 sobre du site, avec un lien vers les voitures. */
export default async function IntrouvableSite() {
  const { chemins } = await etatSite();
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="s-condense s-monte text-[120px] text-site-accent md:text-[180px]" aria-hidden>
        404
      </p>
      <h1 className="s-titre-2 s-monte [animation-delay:120ms]">
        <span className="sr-only">Erreur 404 : </span>Page introuvable.
      </h1>
      <p className="s-intro mt-4">Cette page n&apos;existe pas ou a été déplacée. Cette voiture est peut-être déjà vendue.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Bouton href={chemins.voitures()} taille="grand">
          Voir nos voitures
        </Bouton>
        <Bouton href={chemins.accueil} variante="secondaire">
          Retour à l&apos;accueil
        </Bouton>
      </div>
    </main>
  );
}
