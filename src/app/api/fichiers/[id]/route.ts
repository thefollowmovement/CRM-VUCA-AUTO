// Sert un fichier UNIQUEMENT à un utilisateur connecté et autorisé.
import { db } from "@/lib/db";
import { utilisateurCourant } from "@/lib/permissions";
import { lireApercuPdf, lireMiniature, stockage } from "@/lib/storage";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return new Response("Non connecté", { status: 401 });

  const { id } = await params;
  const fichier = await db.fichier.findUnique({ where: { id } });
  if (!fichier) return new Response("Introuvable", { status: 404 });

  // Investisseur : uniquement le logo et les photos des véhicules auxquels il participe
  // (participation à l'achat, dépense payée, part fixe ou versement reçu).
  if (utilisateur.role === "INVESTISSEUR_LECTURE") {
    const estLogo = fichier.categorie === "LOGO";
    let estSonVehicule = false;
    const partenaireId = utilisateur.partenaireId;
    if (fichier.categorie === "PHOTO_VEHICULE" && fichier.vehiculeId && partenaireId) {
      const vehicule = await db.vehicule.findFirst({
        where: {
          id: fichier.vehiculeId,
          OR: [
            { participations: { some: { partenaireId } } },
            { depenses: { some: { payeParId: partenaireId, payeSurRecettes: false } } },
            { partsFixes: { some: { partenaireId } } },
            { versements: { some: { partenaireId } } },
          ],
        },
        select: { id: true },
      });
      estSonVehicule = !!vehicule;
    }
    if (!estLogo && !estSonVehicule) return new Response("Accès refusé", { status: 403 });
  }

  // ?taille=mini : miniature JPEG (listes, galeries) — images et PDF (1re page).
  // ?taille=page : grand aperçu JPEG d'un PDF (plein écran des avis scannés).
  const taille = new URL(requete.url).searchParams.get("taille");
  const estPdf = fichier.typeMime === "application/pdf";
  const miniature = taille === "mini" && (fichier.typeMime.startsWith("image/") || estPdf);
  const apercuPage = taille === "page" && estPdf;

  try {
    const contenu = miniature ? await lireMiniature(fichier.cleStockage) : apercuPage ? await lireApercuPdf(fichier.cleStockage) : await stockage.lire(fichier.cleStockage);
    return new Response(new Uint8Array(contenu), {
      headers: {
        "Content-Type": miniature || apercuPage ? "image/jpeg" : fichier.typeMime,
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
