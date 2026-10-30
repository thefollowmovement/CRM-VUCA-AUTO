// =====================================================================
//  Comptage des visites et des clics du site public (routes /api/site/vue et /api/site/clic).
//  Uniquement des compteurs par jour : aucune donnée personnelle, aucune adresse IP en base.
// =====================================================================
import { createHash } from "node:crypto";
import { Prisma, type TypeStatSite } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { estRobot, Limiteur } from "@/lib/site/limiteur";
import { jourStat } from "./statistiques";
import { annonceVisible } from "./visibilite";

// Un seul limiteur pour le processus (survit au rechargement à chaud en développement)
const globalLimiteur = globalThis as unknown as { limiteurCompteurs?: Limiteur };
const limiteur = (globalLimiteur.limiteurCompteurs ??= new Limiteur());

export type Contexte = { ip: string | null; agent: string | null; secFetchSite: string | null };
export type Resultat = "compte" | "doublon" | "trop" | "robot" | "ignore";

/** Empreinte du visiteur (IP + secret du serveur) : impossible de retrouver l'adresse, oubliée en quelques minutes. */
const empreinte = (ip: string | null) =>
  createHash("sha256").update(`${ip ?? "inconnue"}|${process.env.AUTH_SECRET ?? "vuca"}`).digest("base64url").slice(0, 22);

/** Première adresse de X-Forwarded-For (posée par Caddy), sinon rien. */
export function ipDepuisEntetes(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** Ajoute 1 au compteur du jour (création au premier passage, sans conflit en cas de requêtes simultanées). */
async function incrementer(type: TypeStatSite, cle: string, annonceId: string | null) {
  const jour = jourStat(new Date());
  const ajout = () => db.statistiqueSite.upsert({ where: { jour_type_cle: { jour, type, cle } }, create: { jour, type, cle, annonceId, compte: 1 }, update: { compte: { increment: 1 } } });
  try {
    await ajout();
  } catch (e) {
    // Deux premières requêtes du jour en même temps : la seconde retente (la ligne existe désormais)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") await ajout();
    else throw e;
  }
}

export async function compter(type: TypeStatSite, slug: string | null, ctx: Contexte): Promise<Resultat> {
  if (estRobot(ctx.agent)) return "robot";
  // Requête venue d'un autre site : ignorée (sendBeacon / fetch du site = « same-origin »)
  if (ctx.secFetchSite && ctx.secFetchSite !== "same-origin") return "ignore";
  const r = await db.reglagesSite.findUnique({ where: { id: 1 }, select: { enLigne: true } });
  if (!r?.enLigne) return "ignore"; // site en maintenance : rien à compter

  let annonceId: string | null = null;
  if (slug) {
    if (!/^[a-z0-9-]{3,120}$/.test(slug)) return "ignore";
    const a = await db.annonce.findUnique({ where: { slug }, select: { id: true, publiee: true, publieeLe: true, vehicule: { select: { statut: true, archiveLe: true } } } });
    if (!a || !annonceVisible(a, a.vehicule)) return "ignore";
    annonceId = a.id;
  }
  if (type === "VUE_ANNONCE" && !annonceId) return "ignore";
  const cle = type === "VUE_SITE" || !annonceId ? "site" : annonceId;

  // « Visite du site » = un même visiteur compté une fois par 30 min, quelle que soit la page
  const decision = limiteur.decider(empreinte(ctx.ip), type, cle);
  if (decision !== "compter") return decision;
  await incrementer(type, cle, type === "VUE_SITE" ? null : annonceId);
  return "compte";
}
