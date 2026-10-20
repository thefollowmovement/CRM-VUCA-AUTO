// Plan du site pour les moteurs de recherche (adresses absolues en https://vuca-auto.fr).
// Les fiches véhicules s'y ajouteront avec les pages publiques (Phase S3).
import { urlSite } from "@/lib/domaines";

// Rendu à la demande : l'adresse du site vient de SITE_DOMAIN au moment de l'exécution.
export const dynamic = "force-dynamic";

export function GET() {
  const pages = ["/"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${urlSite(p)}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
