// robots.txt selon le domaine : le site public est indexable, le CRM ne l'est jamais.
import { lireConfigDomaines, normaliserHote, urlSite } from "@/lib/domaines";

// Rendu à chaque demande : le contenu dépend du domaine.
export const dynamic = "force-dynamic";

export function GET(requete: Request) {
  const { site } = lireConfigDomaines(process.env);
  const estSite = !!site && normaliserHote(requete.headers.get("host")) === site;
  const contenu = estSite ? `User-agent: *\nAllow: /\n\nSitemap: ${urlSite("/sitemap.xml", site)}\n` : "User-agent: *\nDisallow: /\n";
  return new Response(contenu, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
