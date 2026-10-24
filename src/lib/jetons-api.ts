// =====================================================================
//  Jetons d'accès de l'extension Chrome « Désignation ANTAI » (fonctions pures).
//  Le jeton n'est montré qu'une fois ; seule son empreinte SHA-256 est enregistrée.
// =====================================================================
import { createHash, randomBytes } from "node:crypto";

export const PREFIXE_JETON = "vuca_";
/** Requêtes autorisées par minute et par jeton (au-delà : 429). */
export const REQUETES_PAR_MINUTE_JETON = 120;

/** Nouveau jeton : « vuca_ » + 32 octets aléatoires en base64url (43 caractères). */
export function genererJeton(): string {
  return PREFIXE_JETON + randomBytes(32).toString("base64url");
}

export function empreinteJeton(jeton: string): string {
  return createHash("sha256").update(jeton, "utf8").digest("hex");
}

/** Début du jeton, affiché dans la liste pour le reconnaître (« vuca_Ab12Cd… »). */
export function apercuJeton(jeton: string): string {
  return `${jeton.slice(0, PREFIXE_JETON.length + 6)}…`;
}

/** « Bearer <jeton> » → jeton (null si l'en-tête est absent ou mal formé). */
export function jetonDepuisEntete(entete: string | null | undefined): string | null {
  const m = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(entete ?? "");
  if (!m) return null;
  const jeton = m[1]!;
  // Garde-fou : forme attendue uniquement (évite de hacher n'importe quoi de très long)
  return jeton.length <= 200 && /^[A-Za-z0-9_-]+$/.test(jeton) ? jeton : null;
}
