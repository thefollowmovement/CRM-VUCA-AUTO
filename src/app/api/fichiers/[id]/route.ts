// Sert un fichier UNIQUEMENT à un utilisateur connecté et autorisé.
import { db } from "@/lib/db";
import { utilisateurCourant } from "@/lib/permissions";
import { lireMiniature, stockage } from "@/lib/storage";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return new Response("Non connecté", { status: 401 });

  const { id } = await params;
  const fichier = await db.fichier.findUnique({ where: { id } });
  if (!fichier) return new Response("Introuvable", { status: 404 });

  // Investisseur : uniquement le logo et les photos des véhicules qu'il finance.
  if (utilisateur.role === "INVESTISSEUR_LECTURE") {
    const estLogo = fichier.categorie === "LOGO";
    let estSonVehicule = false;
    if (fichier.categorie === "PHOTO_VEHICULE" && fichier.vehiculeId && utilisateur.partenaireId) {
      const participation = await db.participation.findFirst({
        where: { vehiculeId: fichier.vehiculeId, partenaireId: utilisateur.partenaireId },
        select: { id: true },
      });
      estSonVehicule = !!participation;
    }
    if (!estLogo && !estSonVehicule) return new Response("Accès refusé", { status: 403 });
  }

  // ?taille=mini : miniature JPEG (listes, galeries) — uniquement pour les images.
  const miniature = new URL(requete.url).searchParams.get("taille") === "mini" && fichier.typeMime.startsWith("image/");

  try {
    const contenu = miniature ? await lireMiniature(fichier.cleStockage) : await stockage.lire(fichier.cleStockage);
    return new Response(new Uint8Array(contenu), {
      headers: {
        "Content-Type": miniature ? "image/jpeg" : fichier.typeMime,
        "Content-Length": String(contenu.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(fichier.nomOriginal)}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Fichier absent du stockage", { status: 404 });
  }
}
