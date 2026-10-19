// RGPD : export des données d'un client (fichier JSON lisible).
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      fichiers: { select: { categorie: true, nomOriginal: true, creeLe: true } },
      contrats: {
        select: {
          numero: true, statut: true, type: true, departPrevuLe: true, retourPrevuLe: true, departReelLe: true, retourReelLe: true,
          prixTotalCentimes: true, cautionCentimes: true,
          vehicule: { select: { marque: true, modele: true, immatriculation: true } },
          paiements: { select: { date: true, montantCentimes: true, mode: true, nature: true } },
        },
      },
      amendes: { select: { infractionLe: true, lieu: true, montantCentimes: true, statut: true } },
    },
  });
  if (!client) return new Response("Introuvable", { status: 404 });
  await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ExportClient", entiteId: id });
  const nom = `client-${client.nom}-${client.prenom ?? ""}`.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  return new Response(JSON.stringify({ exporteLe: new Date().toISOString(), client }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
