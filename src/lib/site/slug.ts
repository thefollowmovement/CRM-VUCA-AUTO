// Adresse (slug) et référence publique d'une annonce.

/** « Peugeot 208 1.2 PureTech » → « peugeot-208-1-2-puretech » (sans accents ni caractères spéciaux). */
export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Finition lisible tirée de la version : les mots après la motorisation (dernier mot contenant un chiffre),
 * sinon les mots qui la précèdent. « 1.2 PureTech 100 Allure » → « Allure », « 1.5 BlueHDi 130 GT Line » → « GT Line »,
 * « Stepway TCe 90 » → « Stepway TCe ».
 */
export function finition(version: string | null | undefined): string | null {
  const mots = (version ?? "").trim().split(/\s+/).filter(Boolean);
  const dernierChiffre = mots.findLastIndex((m) => /\d/.test(m));
  const lettres = (liste: string[]) => liste.filter((m) => /^[\p{L}][\p{L}-]*$/u.test(m));
  const apres = lettres(mots.slice(dernierChiffre + 1));
  const choix = apres.length ? apres : lettres(mots.slice(0, Math.max(0, mots.findIndex((m) => /\d/.test(m)))));
  return choix.length ? choix.slice(0, 3).join(" ") : null;
}

/**
 * Slug d'une annonce : marque-modele-finition-annee-xxxx (4 caractères tirés de l'identifiant,
 * pour qu'il soit unique) — ex. « peugeot-208-allure-2021-a1b2 ».
 */
export function creerSlug(v: { marque: string; modele: string; version?: string | null; annee?: number | null }, id: string): string {
  const suffixe = id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-4) || "0000";
  const base = slugifier([v.marque, v.modele, finition(v.version), v.annee].filter(Boolean).join(" ")).slice(0, 70).replace(/-+$/, "");
  return `${base || "vehicule"}-${suffixe}`;
}

/** Titre proposé : « Peugeot 208 1.2 PureTech 100 Allure » */
export function titreParDefaut(v: { marque: string; modele: string; version?: string | null }): string {
  return [v.marque, v.modele, v.version].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** 42 → « VA-0042 » */
export function referenceAnnonce(numero: number): string {
  return `VA-${String(numero).padStart(4, "0")}`;
}
