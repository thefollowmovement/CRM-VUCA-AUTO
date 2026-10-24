// Jetons de l'extension ANTAI côté serveur : vérification d'une requête et limite de débit.
import { db } from "@/lib/db";
import { empreinteJeton, jetonDepuisEntete, REQUETES_PAR_MINUTE_JETON } from "@/lib/jetons-api";
import { Limiteur } from "@/lib/site/limiteur";

export type JetonVerifie = { id: string; nom: string; creeParId: string | null };

// En mémoire du serveur (un seul processus) ; même mécanisme que les compteurs du site.
const globale = globalThis as unknown as { limiteurAntai?: Limiteur };
const limiteur = (globale.limiteurAntai ??= new Limiteur({ requetesParMinute: REQUETES_PAR_MINUTE_JETON, fenetreDoublonMs: () => 0, tailleMax: 5_000 }));

/** Jeton valide (non révoqué) de l'en-tête Authorization, sinon null. Note la date de dernière utilisation. */
export async function verifierJeton(entete: string | null): Promise<JetonVerifie | null> {
  const jeton = jetonDepuisEntete(entete);
  if (!jeton) return null;
  const j = await db.jetonApi.findUnique({ where: { empreinte: empreinteJeton(jeton) }, select: { id: true, nom: true, creeParId: true, revoqueLe: true, dernierUsageLe: true } });
  if (!j || j.revoqueLe) return null;
  // Au plus une écriture par minute et par jeton
  if (!j.dernierUsageLe || Date.now() - j.dernierUsageLe.getTime() > 60_000) {
    await db.jetonApi.update({ where: { id: j.id }, data: { dernierUsageLe: new Date() } });
  }
  return { id: j.id, nom: j.nom, creeParId: j.creeParId };
}

/** false si le jeton a dépassé 120 requêtes sur la dernière minute. */
export function debitAutorise(jetonId: string): boolean {
  return limiteur.decider(jetonId, "api", "") !== "trop";
}
