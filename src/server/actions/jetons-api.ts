"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apercuJeton, empreinteJeton, genererJeton } from "@/lib/jetons-api";
import { journaliser } from "@/lib/journal";
import { avecDroits, ErreurMetier, ROLES_ADMIN } from "@/lib/permissions";

const CHEMIN = "/reglages/extension-antai";
const schemaNom = z.string().trim().min(1, "Donnez un nom au jeton (ex. « Chrome du bureau »).").max(60, "60 caractères au maximum.");

/** Crée un jeton pour l'extension ANTAI. Le jeton en clair n'est renvoyé QU'ICI (une seule fois). */
export async function creerJetonApi(nom: string) {
  return avecDroits<{ jeton: string }>(ROLES_ADMIN, async (u) => {
    const lu = schemaNom.safeParse(nom);
    if (!lu.success) return { ok: false, message: lu.error.issues[0]?.message ?? "Nom invalide.", erreursChamps: { nom: lu.error.issues.map((i) => i.message) } };
    const actifs = await db.jetonApi.count({ where: { revoqueLe: null } });
    if (actifs >= 20) throw new ErreurMetier("20 jetons actifs au maximum : révoquez ceux qui ne servent plus.");
    const jeton = genererJeton();
    const cree = await db.jetonApi.create({ data: { nom: lu.data, empreinte: empreinteJeton(jeton), apercu: apercuJeton(jeton), creeParId: u.id } });
    // Jamais le jeton lui-même dans le journal
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "JetonApi", entiteId: cree.id, apres: { nom: cree.nom, apercu: cree.apercu } });
    revalidatePath(CHEMIN);
    return { ok: true, donnees: { jeton } };
  });
}

/** Révoque un jeton : l'extension qui l'utilise reçoit aussitôt « 401 ». */
export async function revoquerJetonApi(id: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const j = await db.jetonApi.findUnique({ where: { id } });
    if (!j) throw new ErreurMetier("Jeton introuvable.");
    if (j.revoqueLe) throw new ErreurMetier("Ce jeton est déjà révoqué.");
    await db.jetonApi.update({ where: { id }, data: { revoqueLe: new Date() } });
    await journaliser({ utilisateurId: u.id, action: "SUPPRESSION", entite: "JetonApi", entiteId: id, avant: { nom: j.nom, apercu: j.apercu } });
    revalidatePath(CHEMIN);
    return { ok: true, message: `Jeton « ${j.nom} » révoqué.` };
  });
}
