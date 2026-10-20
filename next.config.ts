import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les fichiers envoyés (photos, scans) peuvent dépasser la limite par défaut de 1 Mo.
  experimental: {
    serverActions: { bodySizeLimit: "15mb" },
    // N'embarque que les composants Radix réellement utilisés.
    optimizePackageImports: ["radix-ui"],
  },
  // Métadonnées (titre, description, Open Graph) toujours dans le <head>, pour tous les visiteurs :
  // sans cela, Next les envoie en fin de page aux navigateurs « non robots », et certains outils
  // de référencement ou d'aperçu de liens ne les voient pas. Les pages attendent ces données de toute façon.
  htmlLimitedBots: /.*/,
  // pg et bcryptjs restent côté serveur Node.js.
  serverExternalPackages: ["pg", "bcryptjs", "@react-pdf/renderer", "exceljs"],
};

export default nextConfig;
