// Photo publique du site : /photos/[id]/[largeur]?v=… (voir server/site/photos.ts).
import { estLargeurAutorisee } from "@/lib/site/photos";
import { photoPublique } from "@/server/site/photos";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string; largeur: string }> }) {
  const { id, largeur: brute } = await params;
  const largeur = estLargeurAutorisee(brute);
  if (!largeur || !/^[a-z0-9]{10,40}$/.test(id)) return new Response("Introuvable", { status: 404 });
  const photo = await photoPublique(id, largeur, requete.headers.get("accept"));
  if (!photo) return new Response("Introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  const versionnee = new URL(requete.url).searchParams.has("v");
  return new Response(new Uint8Array(photo.contenu), {
    headers: {
      "Content-Type": photo.type,
      // Adresse versionnée (change avec le recadrage) : cache d'un an ; sinon une heure
      "Cache-Control": versionnee ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      Vary: "Accept",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
