// GET /api/antai/ping — test de connexion de l'extension Chrome (« Tester la connexion »).
import { societeAntai } from "@/lib/amendes-antai";
import { lireReglages } from "@/lib/reglages";
import { authentifier, json } from "@/server/antai/reponses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const jeton = await authentifier(req);
  if (jeton instanceof Response) return jeton;
  return json({ ok: true, societe: societeAntai(await lireReglages()).raison_sociale });
}
