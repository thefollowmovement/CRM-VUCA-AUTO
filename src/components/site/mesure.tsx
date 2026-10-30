"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Envoi discret qui ne bloque jamais la navigation (ni l'ouverture de WhatsApp). */
function envoyer(url: string, donnees: Record<string, string | null>) {
  const corps = JSON.stringify(donnees);
  try {
    if (navigator.sendBeacon?.(url, new Blob([corps], { type: "text/plain" }))) return;
  } catch {
    // on tente fetch ci-dessous
  }
  fetch(url, { method: "POST", body: corps, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => undefined);
}

/** Adresse d'une fiche véhicule → son identifiant d'annonce (slug), sinon null. */
const slugDepuis = (chemin: string) => /^\/voitures\/([a-z0-9-]+)\/?$/.exec(chemin)?.[1] ?? null;

/**
 * Mesure d'audience du site public, sans cookie ni donnée personnelle :
 *  - une visite (et une vue d'annonce sur une fiche) à chaque page affichée ;
 *  - un clic à chaque lien WhatsApp (wa.me) ou téléphone (tel:), où qu'il soit sur la page.
 * Le serveur ignore les doublons, les robots et les excès (voir server/site/compteurs.ts).
 */
export function MesureSite() {
  const chemin = usePathname();

  useEffect(() => {
    envoyer("/api/site/vue", { type: "VUE_SITE" });
    const slug = slugDepuis(chemin);
    if (slug) envoyer("/api/site/vue", { type: "VUE_ANNONCE", slug });
  }, [chemin]);

  useEffect(() => {
    const surClic = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      const href = lien?.getAttribute("href") ?? "";
      const slug = slugDepuis(window.location.pathname);
      if (href.startsWith("https://wa.me/")) envoyer("/api/site/clic", { type: "CLIC_WHATSAPP", slug });
      else if (href.startsWith("tel:")) envoyer("/api/site/clic", { type: "CLIC_APPEL", slug });
    };
    // « auxclick » : clic molette (ouverture dans un nouvel onglet)
    document.addEventListener("click", surClic, { capture: true });
    document.addEventListener("auxclick", surClic, { capture: true });
    return () => {
      document.removeEventListener("click", surClic, { capture: true });
      document.removeEventListener("auxclick", surClic, { capture: true });
    };
  }, []);

  return null;
}
