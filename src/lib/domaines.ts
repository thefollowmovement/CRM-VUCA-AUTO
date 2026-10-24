// =====================================================================
//  Routage par nom de domaine (utilisé par le middleware, compatible edge).
//
//   SITE_DOMAIN (ex. vuca-auto.fr)     → site vitrine public, sans connexion
//   CRM_DOMAIN  (ex. crm.vuca-auto.fr) → CRM avec connexion
//   tout autre nom (alias sslip.io, localhost, IP) → CRM, comme avant
//
//  Fonction pure et testée : elle dit QUOI faire, le middleware le fait.
// =====================================================================

export type ConfigDomaines = { site: string | null; crm: string | null };

export type Decision =
  /** Page ou route du site public (réécrite vers `chemin` si différent de l'adresse). */
  | { type: "site"; chemin: string }
  /** Comportement habituel du CRM (contrôle de connexion). */
  | { type: "crm" }
  /** Fichier technique servi tel quel, sans connexion. */
  | { type: "libre" }
  /** 404 : page du site « introuvable » ou réponse JSON pour une API. */
  | { type: "introuvable"; api: boolean }
  | { type: "redirection"; url: string; statut: 307 | 308 }
  /** Aperçu du vrai site depuis le CRM (connexion exigée) : page du site servie sous /apercu-site. */
  | { type: "apercu"; chemin: string };

/** Accueil du site : `/` sur le domaine public est servi par cette page interne du groupe `(site)`. */
export const ACCUEIL_SITE = "/site-accueil";
/** Page 404 du site (appelle notFound()) : cible des réécritures « introuvable ». */
export const INTROUVABLE_SITE = "/site-introuvable";

/** Adresses du site public (groupe `app/(site)`), en plus de `/`. */
const PREFIXES_SITE = ["/voitures", "/a-propos", "/contact", "/mentions-legales", "/confidentialite", "/photos", "/partage", "/api/site", "/sitemap.xml"];
/** Fichiers servis sur les deux domaines, sans connexion (leur contenu peut dépendre du domaine). */
const FICHIERS_COMMUNS = ["/favicon.ico", "/icon.svg", "/icones/", "/manifest.webmanifest", "/robots.txt", "/_next/"];
/**
 * Propres au CRM, sans contrôle du middleware : application installable, routes de connexion d'Auth.js
 * et API de l'extension ANTAI (protégée par son propre jeton « Bearer », jamais par le cookie de session).
 */
const FICHIERS_CRM = ["/sw.js", "/hors-ligne.html", "/api/auth", "/api/antai"];
/** Pages du CRM qui montrent le site (aperçu), protégées par la connexion. */
const APERCU_CRM = ["/site-preview"];
/** Préfixe de l'aperçu du vrai site sur le domaine du CRM (même si le site est en maintenance). */
export const PREFIXE_APERCU = "/apercu-site";
/** En-tête posé UNIQUEMENT par le middleware pour signaler une page vue en aperçu (retiré de toute requête entrante). */
export const ENTETE_APERCU = "x-vuca-apercu";

const correspond = (chemin: string, prefixes: string[]) =>
  prefixes.some((p) => (p.endsWith("/") ? chemin.startsWith(p) : chemin === p || chemin.startsWith(`${p}/`)));

/** « Crm.Vuca-Auto.fr:443 » → « crm.vuca-auto.fr » */
export function normaliserHote(hote: string | null | undefined): string {
  return (hote ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function lireConfigDomaines(env: Record<string, string | undefined>): ConfigDomaines {
  const site = normaliserHote(env.SITE_DOMAIN) || null;
  const crm = normaliserHote(env.CRM_DOMAIN) || null;
  return { site, crm };
}

export function estCheminSite(chemin: string): boolean {
  return chemin === "/" || chemin === ACCUEIL_SITE || chemin === INTROUVABLE_SITE || correspond(chemin, PREFIXES_SITE);
}

export function deciderRoutage(hoteBrut: string | null | undefined, chemin: string, recherche: string, config: ConfigDomaines): Decision {
  const hote = normaliserHote(hoteBrut);
  const api = chemin.startsWith("/api/");

  // ---- www.vuca-auto.fr → vuca-auto.fr (une seule adresse pour Google)
  if (config.site && hote === `www.${config.site}`) {
    return { type: "redirection", url: `https://${config.site}${chemin}${recherche}`, statut: 308 };
  }

  // ---- Domaine public : uniquement le site, jamais le CRM ni l'écran de connexion
  if (config.site && hote === config.site) {
    if (correspond(chemin, FICHIERS_COMMUNS)) return { type: "libre" };
    if (chemin === "/") return { type: "site", chemin: ACCUEIL_SITE };
    // Adresse interne de l'accueil tapée directement → l'adresse officielle
    if (chemin === ACCUEIL_SITE) return { type: "redirection", url: `https://${config.site}/${recherche}`, statut: 308 };
    if (chemin === INTROUVABLE_SITE) return { type: "introuvable", api: false };
    if (correspond(chemin, PREFIXES_SITE)) return { type: "site", chemin };
    return { type: "introuvable", api };
  }

  // ---- Domaine du CRM (crm.vuca-auto.fr, alias sslip.io, localhost…) : comportement actuel
  if (correspond(chemin, FICHIERS_COMMUNS) || correspond(chemin, FICHIERS_CRM)) return { type: "libre" };
  if (correspond(chemin, APERCU_CRM)) return { type: "crm" };
  if (correspond(chemin, [PREFIXE_APERCU])) {
    const interne = chemin.slice(PREFIXE_APERCU.length) || "/";
    if (interne === "/") return { type: "apercu", chemin: ACCUEIL_SITE };
    if (interne !== ACCUEIL_SITE && interne !== INTROUVABLE_SITE && correspond(interne, PREFIXES_SITE)) return { type: "apercu", chemin: interne };
    return { type: "apercu", chemin: INTROUVABLE_SITE };
  }
  if (chemin !== "/" && estCheminSite(chemin)) {
    // Les pages du site ne sont pas servies ici : on renvoie vers le domaine public
    if (config.site && !api && chemin !== INTROUVABLE_SITE) {
      const cible = chemin === ACCUEIL_SITE ? "/" : chemin;
      return { type: "redirection", url: `https://${config.site}${cible}${recherche}`, statut: 307 };
    }
    return { type: "introuvable", api };
  }
  return { type: "crm" };
}

/** Adresse publique d'une page du site (sitemap, canoniques, partage, liens du CRM). */
export function urlSite(chemin = "/", domaine: string | null = lireConfigDomaines(process.env).site): string {
  const propre = chemin.startsWith("/") ? chemin : `/${chemin}`;
  return domaine ? `https://${domaine}${propre === "/" ? "" : propre}` : propre;
}

/** Lien « Voir l'annonce sur le site ». */
export function urlAnnonce(slug: string, domaine?: string | null): string {
  return urlSite(`/voitures/${encodeURIComponent(slug)}`, domaine === undefined ? lireConfigDomaines(process.env).site : domaine);
}
