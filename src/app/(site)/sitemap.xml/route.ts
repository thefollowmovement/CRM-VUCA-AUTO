// Plan du site pour les moteurs de recherche (adresses absolues en https://vuca-auto.fr).
// Vide tant que le site est en maintenance.
import { urlSite } from "@/lib/domaines";
import { planDuSite } from "@/server/site/public";

// Rendu à la demande : l'adresse du site vient de SITE_DOMAIN, les annonces de la base.
export const dynamic = "force-dynamic";

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const { enLigne, annonces } = await planDuSite();
  const pages: { loc: string; lastmod?: string }[] = enLigne
    ? [
        { loc: "/" },
        { loc: "/voitures" },
        ...annonces.map((a) => ({ loc: `/voitures/${a.slug}`, lastmod: a.misAJourLe.toISOString().slice(0, 10) })),
        { loc: "/a-propos" },
        { loc: "/contact" },
        { loc: "/mentions-legales" },
        { loc: "/confidentialite" },
      ]
    : [];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${echapper(urlSite(p.loc))}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
