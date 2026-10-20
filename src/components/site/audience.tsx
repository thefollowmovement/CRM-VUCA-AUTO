"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Bouton } from "./bouton";

const CLE = "vuca-consentement-audience";
const EVENEMENT = "vuca:cookies";

/** Mémorise le choix du visiteur (localStorage, jamais de cookie) ; null = pas encore répondu. */
function lireChoix(): "oui" | "non" | null {
  try {
    const v = window.localStorage.getItem(CLE);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null;
  }
}

/** Rouvre le bandeau (lien « Cookies » du pied de page). */
export function BoutonCookies() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENEMENT))} className="inline-flex min-h-11 items-center hover:text-site-texte">
      Cookies
    </button>
  );
}

/**
 * Mesure d'audience facultative, réglée dans le CRM (Site web → Référencement) :
 *  - Plausible : sans cookie → chargé directement ;
 *  - Google Analytics : dépose des cookies → chargé SEULEMENT après « Accepter » (bandeau, refus aussi simple que l'accord).
 */
export function Audience({ plausible, googleAnalytics }: { plausible: string | null; googleAnalytics: string | null }) {
  const [choix, setChoix] = useState<"oui" | "non" | null>(null);
  const [bandeau, setBandeau] = useState(false);

  useEffect(() => {
    if (!googleAnalytics) return;
    const c = lireChoix();
    setChoix(c);
    setBandeau(c === null);
    const rouvrir = () => setBandeau(true);
    window.addEventListener(EVENEMENT, rouvrir);
    return () => window.removeEventListener(EVENEMENT, rouvrir);
  }, [googleAnalytics]);

  const repondre = (c: "oui" | "non") => {
    try {
      window.localStorage.setItem(CLE, c);
    } catch {
      // navigation privée : le choix vaut pour cette page
    }
    setChoix(c);
    setBandeau(false);
    // Retrait de l'accord : les cookies Google sont effacés au rechargement
    if (c === "non" && document.cookie.includes("_ga")) {
      for (const nom of document.cookie.split(";").map((x) => x.split("=")[0]!.trim()).filter((n) => n.startsWith("_ga"))) {
        document.cookie = `${nom}=; Max-Age=0; path=/; domain=.${location.hostname}`;
        document.cookie = `${nom}=; Max-Age=0; path=/`;
      }
    }
  };

  return (
    <>
      {plausible && <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}
      {googleAnalytics && choix === "oui" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalytics)}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(googleAnalytics)},{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {googleAnalytics && bandeau && (
        <div role="dialog" aria-label="Mesure d'audience" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-[560px] rounded-carte bg-site-carte p-5 shadow-site-fort md:bottom-6">
          <p className="s-petit text-site-texte">
            Nous aimerions mesurer la fréquentation du site avec Google Analytics, qui dépose des cookies. Acceptez-vous ? Vous pourrez changer d&apos;avis à tout moment (lien « Cookies » en bas de page).
          </p>
          <div className="mt-4 flex gap-3">
            <Bouton variante="contour" className="flex-1" onClick={() => repondre("non")}>
              Refuser
            </Bouton>
            <Bouton variante="contour" className="flex-1" onClick={() => repondre("oui")}>
              Accepter
            </Bouton>
          </div>
        </div>
      )}
    </>
  );
}
