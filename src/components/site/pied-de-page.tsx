import Link from "next/link";
import { LIBELLES_RESEAUX, type Reseau } from "@/lib/site/reglages-defaut";
import { BoutonCookies } from "./audience";
import { LIENS_SITE, Logo, type LogoSite } from "./logo";
import { Conteneur } from "./mise-en-page";

export type InfosPied = {
  logo: LogoSite;
  slogan: string | null;
  formeJuridique: string | null;
  siret: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  reseaux: Partial<Record<Reseau, string>>;
};

const siretLisible = (s: string) => s.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

/** Pied de page : identité légale (SIRET visible), liens, réseaux, pages légales. */
export function PiedDePage({ infos, base = "", cookies = false }: { infos: InfosPied; /** Préfixe des liens (aperçu du CRM) */ base?: string; /** Lien « Cookies » (si Google Analytics est réglé) */ cookies?: boolean }) {
  const annee = new Date().getFullYear();
  const reseaux = Object.entries(infos.reseaux) as [Reseau, string][];
  return (
    <footer className="bg-site-fond-alt text-site-2">
      <Conteneur className="py-12">
        <div className="grid grid-cols-1 gap-10 border-b border-site-sep pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Logo logo={infos.logo} className="text-site-texte" />
            {infos.slogan && <p className="s-petit">{infos.slogan}</p>}
          </div>
          <nav aria-label="Pages du site" className="s-petit">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-site-texte">Le site</h2>
            <ul className="flex flex-col">
              <li>
                <Link href={`${base}/`} className="inline-flex min-h-11 items-center hover:text-site-texte">
                  Accueil
                </Link>
              </li>
              {LIENS_SITE.map((l) => (
                <li key={l.href}>
                  <Link href={`${base}${l.href}`} className="inline-flex min-h-11 items-center hover:text-site-texte">
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="s-petit">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-site-texte">Nous contacter</h2>
            <ul className="flex flex-col">
              {infos.telephone && (
                <li>
                  <a href={`tel:${infos.telephone.replace(/[^\d+]/g, "")}`} className="s-chiffres inline-flex min-h-11 items-center hover:text-site-texte">
                    {infos.telephone}
                  </a>
                </li>
              )}
              {infos.email && (
                <li>
                  <a href={`mailto:${infos.email}`} className="inline-flex min-h-11 items-center break-all hover:text-site-texte">
                    {infos.email}
                  </a>
                </li>
              )}
              {infos.adresse && <li className="whitespace-pre-line py-2">{infos.adresse}</li>}
            </ul>
          </div>
          {reseaux.length > 0 && (
            <div className="s-petit">
              <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-site-texte">Suivez-nous</h2>
              <ul className="flex flex-col">
                {reseaux.map(([r, url]) => (
                  <li key={r}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-site-texte">
                      {LIBELLES_RESEAUX[r]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="s-petit flex flex-col gap-3 pt-6 text-[12px] md:flex-row md:items-center md:justify-between">
          <p>
            © {annee} {infos.logo.nom}
            {infos.formeJuridique && ` · ${infos.formeJuridique}`}
            {infos.siret && <> · SIRET <span className="s-chiffres">{siretLisible(infos.siret)}</span></>}
          </p>
          <ul className="flex flex-wrap gap-x-5">
            <li>
              <Link href={`${base}/mentions-legales`} className="inline-flex min-h-11 items-center hover:text-site-texte">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href={`${base}/confidentialite`} className="inline-flex min-h-11 items-center hover:text-site-texte">
                Confidentialité
              </Link>
            </li>
            {cookies && (
              <li>
                <BoutonCookies />
              </li>
            )}
          </ul>
        </div>
      </Conteneur>
    </footer>
  );
}
