// Image de partage d'une annonce (1200 × 630) : photo de couverture, titre, kilométrage, prix, logo.
import { ImageResponse } from "next/og";
import { ImagePartage, TAILLE_PARTAGE } from "@/components/site/image-partage";
import { partageVoiture, policesPartage } from "@/server/site/partage";

export async function GET(_requete: Request, { params }: { params: Promise<{ slug: string }> }) {
  const [d, polices] = await Promise.all([partageVoiture((await params).slug), policesPartage()]);
  if (!d) return new Response("Introuvable", { status: 404 });
  return new ImageResponse(<ImagePartage d={d} />, { ...TAILLE_PARTAGE, fonts: polices, headers: { "Cache-Control": d.prive ? "private, no-store" : "public, max-age=3600" } });
}
