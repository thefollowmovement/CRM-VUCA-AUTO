import localFont from "next/font/local";

/** Inter auto-hébergée (aucun appel externe) : texte courant. */
export const inter = localFont({
  src: "./polices/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--police-inter",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

/**
 * Archivo auto-hébergée : titres condensés en majuscules. Fichier réduit à ce que le site utilise
 * (graisse 900, largeurs 70 à 86 %) : 24 Ko au lieu de 88 Ko (fontTools instancer, licence OFL).
 */
export const archivo = localFont({
  src: "./polices/archivo-latin-900-condense.woff2",
  weight: "900",
  display: "swap",
  variable: "--police-titres",
  declarations: [{ prop: "font-stretch", value: "70% 86%" }],
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
  adjustFontFallback: false,
});

/** Classes à poser sur la racine `.site` (les deux polices). */
export const policesSite = `${inter.variable} ${archivo.variable}`;
