// Réponses communes de l'API de l'extension ANTAI (JSON, jamais mise en cache, aucun en-tête CORS).
import { NextResponse } from "next/server";
import { debitAutorise, verifierJeton, type JetonVerifie } from "@/server/antai/jetons";

const ENTETES = { "Cache-Control": "no-store" };

export const json = (corps: unknown, statut = 200) => NextResponse.json(corps, { status: statut, headers: ENTETES });

/**
 * Contrôle commun à chaque route : jeton « Bearer » valide (401 sinon) puis limite de débit (429).
 * Renvoie le jeton, ou la réponse d'erreur à retourner telle quelle.
 */
export async function authentifier(req: Request): Promise<JetonVerifie | Response> {
  const jeton = await verifierJeton(req.headers.get("authorization"));
  if (!jeton) return json({ error: "unauthorized" }, 401);
  if (!debitAutorise(jeton.id)) return NextResponse.json({ error: "too_many_requests" }, { status: 429, headers: { ...ENTETES, "Retry-After": "60" } });
  return jeton;
}
