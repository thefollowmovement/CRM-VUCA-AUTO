import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les fichiers envoyés (photos, scans) peuvent dépasser la limite par défaut de 1 Mo.
  experimental: {
    serverActions: { bodySizeLimit: "15mb" },
    // N'embarque que les composants Radix réellement utilisés.
    optimizePackageImports: ["radix-ui"],
  },
  // pg et bcryptjs restent côté serveur Node.js.
  serverExternalPackages: ["pg", "bcryptjs"],
};

export default nextConfig;
