// Relevé PDF de l'investisseur connecté (portail). L'admin peut demander celui d'un investisseur (?partenaire=).
import { utilisateurCourant } from "@/lib/permissions";
import { genererReleve } from "@/server/pdf/generer";

export async function GET(requete: Request) {
  const u = await utilisateurCourant();
  if (!u || u.doitChangerMotDePasse) return new Response("Accès refusé", { status: 403 });
  const p = new URL(requete.url).searchParams;
  // Un investisseur ne peut obtenir QUE son propre relevé (le paramètre « partenaire » est ignoré)
  const partenaireId = u.role === "INVESTISSEUR_LECTURE" ? u.partenaireId : u.role === "ADMIN" ? p.get("partenaire") : null;
  if (!partenaireId) return new Response("Accès refusé", { status: 403 });
  const du = p.get("du") ?? "";
  const au = p.get("au") ?? "";
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(du) || !iso.test(au) || du > au) return new Response("Période invalide", { status: 400 });
  const pdf = await genererReleve(partenaireId, du, au);
  if (!pdf) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(pdf.contenu), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.nom}"`, "Cache-Control": "private, no-store" },
  });
}
