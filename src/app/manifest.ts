import type { MetadataRoute } from "next";

/** Application installable (PWA) : « Ajouter à l'écran d'accueil » sur téléphone. */
export default function manifest(): MetadataRoute.Manifest {
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
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
