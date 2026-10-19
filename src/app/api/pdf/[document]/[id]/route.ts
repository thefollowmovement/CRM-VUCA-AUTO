// PDF générés à la demande (contrat, état des lieux, reçu, facture, relevé de clôture),
// servis uniquement aux utilisateurs autorisés.
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { genererPdf, type TypeDocumentPdf } from "@/server/pdf/generer";

const TYPES: TypeDocumentPdf[] = ["contrat", "edl-depart", "edl-retour", "recu", "facture", "cloture"];

export async function GET(requete: Request, { params }: { params: Promise<{ document: string; id: string }> }) {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });
  const { document, id } = await params;
  if (!TYPES.includes(document as TypeDocumentPdf)) return new Response("Document inconnu", { status: 404 });
  const pdf = await genererPdf(document as TypeDocumentPdf, id);
  if (!pdf) return new Response("Introuvable", { status: 404 });
  const telecharger = new URL(requete.url).searchParams.get("telecharger") === "1";
  return new Response(new Uint8Array(pdf.contenu), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename="${pdf.nom}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
