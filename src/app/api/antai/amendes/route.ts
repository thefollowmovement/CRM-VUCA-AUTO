// GET /api/antai/amendes?statut=a_designer — PV à désigner + société, pour l'extension Chrome.
// Tri : date limite de désignation croissante, puis client. Champs inconnus = "" (jamais absents).
import { journaliser } from "@/lib/journal";
import { amendesPourDesignation } from "@/server/amendes/pour-designation";
import { authentifier, json } from "@/server/antai/reponses";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const jeton = await authentifier(req);
  if (jeton instanceof Response) return jeton;
  const statut = new URL(req.url).searchParams.get("statut") ?? "a_designer";
  if (statut !== "a_designer") return json({ error: "statut_invalide" }, 400);
  const donnees = await amendesPourDesignation();
  // Données personnelles lues : trace de qui (quel jeton), sans leur contenu
  await journaliser({ utilisateurId: jeton.creeParId, action: "MODIFICATION", entite: "ExportAmendes", apres: { source: `Extension ANTAI — ${jeton.nom}`, nombre: donnees.amendes.length } });
  return json(donnees);
}
