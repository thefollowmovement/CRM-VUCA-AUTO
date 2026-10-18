import { db } from "@/lib/db";

/** Lit les réglages (crée la ligne par défaut si elle n'existe pas encore). */
export async function lireReglages() {
  return db.reglages.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
