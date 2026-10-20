import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { lireConfigDomaines, normaliserHote } from "@/lib/domaines";

// Rendu à chaque demande : le contenu dépend du domaine.
export const dynamic = "force-dynamic";

/** Application installable : celle du CRM, ou une version simple pour le site public. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site } = lireConfigDomaines(process.env);
  const estSite = !!site && normaliserHote((await headers()).get("host")) === site;
  const icones: MetadataRoute.Manifest["icons"] = [
    { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
  if (estSite) {
    return {
      name: "VUCA AUTO",
      short_name: "VUCA AUTO",
      description: "Véhicules d'occasion",
      lang: "fr",
      start_url: "/",
      display: "browser",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: icones,
    };
  }
  return {
    name: "VUCA AUTO CRM",
    short_name: "VUCA AUTO",
    description: "Gestion achat-revente et location de véhicules",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#2546c4",
    icons: icones,
  };
}
