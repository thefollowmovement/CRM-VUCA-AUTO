// POST /api/antai/amendes/{id}/designee — l'extension a validé la désignation sur le site de l'ANTAI.
// Corps (facultatif) : { "date_designation": "AAAA-MM-JJTHH:MM" }. 409 si le PV n'est pas « à désigner ».
import { lireDateDesignation } from "@/lib/amendes-antai";
import { db } from "@/lib/db";
import { designerAmende, ErreurDesignation } from "@/server/amendes/designation";
import { authentifier, json } from "@/server/antai/reponses";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jeton = await authentifier(req);
  if (jeton instanceof Response) return jeton;
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return json({ error: "not_found" }, 404);

  let corps: Record<string, unknown> = {};
  const texte = (await req.text()).slice(0, 10_000);
  if (texte.trim()) {
    try {
      const lu: unknown = JSON.parse(texte);
      if (!lu || typeof lu !== "object" || Array.isArray(lu)) return json({ error: "corps_invalide" }, 400);
      corps = lu as Record<string, unknown>;
    } catch {
      return json({ error: "corps_invalide" }, 400);
    }
  }
  const date = lireDateDesignation(corps.date_designation);
  if (!date) return json({ error: "date_designation_invalide" }, 400);

  try {
    await db.$transaction((tx) =>
      designerAmende(tx, { id, date, utilisateurId: jeton.creeParId, statutsAutorises: ["A_DESIGNER"], source: `Extension ANTAI — ${jeton.nom}` }),
    );
  } catch (e) {
    if (e instanceof ErreurDesignation) return e.code === "introuvable" ? json({ error: "not_found" }, 404) : json({ error: "not_a_designer" }, 409);
    console.error("[API ANTAI] désignation", e instanceof Error ? e.message : e);
    return json({ error: "server_error" }, 500);
  }
  return json({ ok: true, id, statut: "designe" });
}
