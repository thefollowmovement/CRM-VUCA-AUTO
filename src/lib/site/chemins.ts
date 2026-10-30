// Adresses des pages du site. Sur vuca-auto.fr : « /voitures »… ; dans l'aperçu du CRM,
// les mêmes pages sont servies sous « /apercu-site/… » (base), pour rester dans le CRM.

export type CheminsSite = ReturnType<typeof cheminsSite>;

export function cheminsSite(base = "") {
  const c = (chemin: string) => `${base}${chemin}`;
  return {
    base,
    accueil: base || "/",
    voitures: (recherche = "") => c(`/voitures${recherche && !recherche.startsWith("?") ? `?${recherche}` : recherche}`),
    voiture: (slug: string) => c(`/voitures/${encodeURIComponent(slug)}`),
    aPropos: c("/a-propos"),
    contact: c("/contact"),
    mentionsLegales: c("/mentions-legales"),
    confidentialite: c("/confidentialite"),
    /** Préfixe des photos publiques (voir lib/site/photos.ts). */
    photos: c("/photos"),
  };
}
