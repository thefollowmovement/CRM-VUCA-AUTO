import localFont from "next/font/local";

/** Inter auto-hébergée (aucun appel externe) : secours quand SF Pro n'est pas sur l'appareil. */
export const inter = localFont({
  src: "./polices/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--police-inter",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});
