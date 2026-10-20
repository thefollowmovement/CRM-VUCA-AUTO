"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Bouton } from "./bouton";
import { LIENS_SITE, Logo, type LogoSite } from "./logo";

export type { LogoSite };

/** Barre de navigation fine et translucide : logo · Nos voitures · À propos · Contact · WhatsApp. */
export function NavigationSite({ logo, lienWhatsApp, accueil = "/", base = "" }: { logo: LogoSite; lienWhatsApp: string | null; accueil?: string; /** Préfixe des liens (aperçu du CRM : adresse du site public) */ base?: string }) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => setOuvert(false), [chemin]);
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [ouvert]);
  const actif = (href: string) => chemin === href || chemin.startsWith(`${href}/`);

  return (
    <header className="s-nav sticky top-0 z-40 border-b border-site-sep/60">
      <nav aria-label="Navigation principale" className="mx-auto flex h-13 w-full max-w-[1200px] items-center gap-6 px-4 md:h-14 md:px-6">
        <Link href={accueil} className="flex min-h-11 items-center" aria-label={`${logo.nom} — accueil`}>
          <Logo logo={logo} />
        </Link>
        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {LIENS_SITE.map((l) => (
            <li key={l.href}>
              <Link
                href={`${base}${l.href}`}
                aria-current={actif(l.href) ? "page" : undefined}
                className={cn("s-transition inline-flex min-h-11 items-center rounded-full px-3 text-[14px] transition-colors", actif(l.href) ? "text-site-texte font-medium" : "text-site-2 hover:text-site-texte")}
              >
                {l.libelle}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {lienWhatsApp && (
            <Bouton href={lienWhatsApp} externe variante="whatsapp" taille="compact">
              WhatsApp
            </Bouton>
          )}
          <button
            type="button"
            className="s-transition inline-flex size-11 items-center justify-center rounded-full text-site-texte transition-colors hover:bg-site-fond-alt md:hidden"
            aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={ouvert}
            aria-controls="menu-site"
            onClick={() => setOuvert(!ouvert)}
          >
            {ouvert ? <X className="size-6" strokeWidth={1.5} aria-hidden /> : <Menu className="size-6" strokeWidth={1.5} aria-hidden />}
          </button>
        </div>
      </nav>
      {ouvert && (
        <div id="menu-site" className="border-t border-site-sep/60 md:hidden">
          <ul className="mx-auto flex max-w-[1200px] flex-col px-4 py-3">
            {LIENS_SITE.map((l) => (
              <li key={l.href}>
                <Link href={`${base}${l.href}`} aria-current={actif(l.href) ? "page" : undefined} className="flex min-h-12 items-center text-[21px] font-semibold tracking-[-0.02em]">
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
