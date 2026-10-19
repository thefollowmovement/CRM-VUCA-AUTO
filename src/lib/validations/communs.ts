// Briques de validation Zod partagées entre formulaires (client) et
// Server Actions (serveur). Messages en français.
import { z } from "zod";
import fr from "zod/v4/locales/fr.js";
import { dateCalendaireDepuisISO, parseEurosEnCentimes } from "@/lib/format";

// Messages d'erreur Zod en français (seule la langue française est chargée).
z.config(fr());

/** Texte obligatoire (espaces retirés). */
export const texte = (libelle: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${libelle} est obligatoire.`)
    .max(max, `${libelle} : ${max} caractères maximum.`);

/** Texte facultatif : chaîne vide → null. */
export const texteOptionnel = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((v) => (v === "" ? null : v));

/** Email facultatif : chaîne vide → null. */
export const emailOptionnel = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Adresse email invalide.")
  .transform((v) => (v === "" ? null : v));

/** Montant saisi en euros (« 1 234,56 ») → centimes. Refuse les négatifs. */
export const montant = (libelle = "Le montant") =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const c = parseEurosEnCentimes(v);
      if (c === null) {
        ctx.addIssue({ code: "custom", message: `${libelle} est invalide (ex. 1 234,56).` });
        return z.NEVER;
      }
      if (c < 0) {
        ctx.addIssue({ code: "custom", message: `${libelle} ne peut pas être négatif.` });
        return z.NEVER;
      }
      return c;
    });

/** Montant facultatif : chaîne vide → null. */
export const montantOptionnel = (libelle = "Le montant") =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const c = parseEurosEnCentimes(v);
      if (c === null || c < 0) {
        ctx.addIssue({ code: "custom", message: `${libelle} est invalide (ex. 1 234,56).` });
        return z.NEVER;
      }
      return c;
    });

/** Entier saisi dans un champ texte/nombre, entre min et max. */
export const entier = (libelle: string, min = 0, max = 1_000_000) =>
  z.coerce
    .number({ error: `${libelle} doit être un nombre.` })
    .int(`${libelle} doit être un nombre entier.`)
    .min(min, `${libelle} : minimum ${min}.`)
    .max(max, `${libelle} : maximum ${max}.`);

/** Date « AAAA-MM-JJ » (input type=date) → Date @db.Date. */
export const dateCalendaire = (libelle = "La date") =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = dateCalendaireDepuisISO(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: `${libelle} est invalide.` });
        return z.NEVER;
      }
      return d;
    });

/** Identifiant (cuid) obligatoire. */
export const identifiant = (libelle = "Ce choix") =>
  z.string().trim().min(1, `${libelle} est obligatoire.`);

/** Entier facultatif saisi dans un champ : vide → null. */
export const entierOptionnel = (libelle: string, min = 0, max = 10_000_000) =>
  z
    .union([z.string(), z.number()])
    .transform((v, ctx) => {
      const s = String(v).replace(/[\s  ]/g, "");
      if (s === "") return null;
      if (!/^-?\d+$/.test(s)) {
        ctx.addIssue({ code: "custom", message: `${libelle} doit être un nombre entier.` });
        return z.NEVER;
      }
      const n = Number(s);
      if (n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `${libelle} : entre ${min} et ${max}.` });
        return z.NEVER;
      }
      return n;
    });

/** Date « AAAA-MM-JJ » facultative : vide → null. */
export const dateOptionnelle = (libelle = "La date") =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const d = dateCalendaireDepuisISO(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: `${libelle} est invalide.` });
        return z.NEVER;
      }
      return d;
    });

/** Choix facultatif dans une liste : vide → null. */
export const choixOptionnel = <T extends string>(valeurs: readonly [T, ...T[]]) =>
  z.union([z.enum(valeurs), z.literal("")]).transform((v) => (v === "" ? null : (v as T)));

/** Adresse web facultative. */
export const urlOptionnelle = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), "Adresse web invalide (doit commencer par http:// ou https://).")
  .transform((v) => (v === "" ? null : v));
