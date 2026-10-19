import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

// Sans caractères ambigus (0/O, 1/l/I) pour être recopié facilement.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Mot de passe temporaire lisible, ex. « Kp7m-Xq2r-Tz9w ». */
export function genererMotDePasseTemporaire(): string {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  let mdp = `${bloc()}-${bloc()}-${bloc()}`;
  if (!/\d/.test(mdp)) mdp = mdp.slice(0, -1) + String(randomInt(2, 10));
  return mdp;
}

export function hacherMotDePasse(motDePasse: string) {
  return bcrypt.hash(motDePasse, 12);
}
