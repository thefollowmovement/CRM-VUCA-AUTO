// Traitement commun des routes de comptage : corps JSON minuscule, réponse 204 sans contenu.
import type { TypeStatSite } from "@/generated/prisma/client";
import { compter, ipDepuisEntetes } from "./compteurs";

export async function traiterCompteur(requete: Request, typesAutorises: TypeStatSite[]): Promise<Response> {
  const vide = (statut = 204, resultat = "") => new Response(null, { status: statut, headers: { "Cache-Control": "no-store", ...(resultat ? { "X-Compteur": resultat } : {}) } });
  let corps: unknown;
  try {
    const texte = await requete.text();
    if (texte.length > 300) return vide(400);
    corps = JSON.parse(texte);
  } catch {
    return vide(400);
  }
  const { type, slug } = (corps ?? {}) as { type?: unknown; slug?: unknown };
  if (typeof type !== "string" || !(typesAutorises as string[]).includes(type)) return vide(400);
  if (slug !== undefined && slug !== null && typeof slug !== "string") return vide(400);
  const resultat = await compter(type as TypeStatSite, (slug as string | null | undefined) ?? null, {
    ip: ipDepuisEntetes(requete.headers),
    agent: requete.headers.get("user-agent"),
    secFetchSite: requete.headers.get("sec-fetch-site"),
  });
  // 204 dans tous les cas (le visiteur n'a rien à attendre) ; 429 seulement si le débit est dépassé
  return vide(resultat === "trop" ? 429 : 204, resultat);
}
