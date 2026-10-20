// Image de partage générale du site (1200 × 630), utilisée si aucune image n'est choisie dans le CRM.
import { ImageResponse } from "next/og";
import { ImagePartage, TAILLE_PARTAGE } from "@/components/site/image-partage";
import { partageSite, policesPartage } from "@/server/site/partage";

export async function GET() {
  const [d, polices] = await Promise.all([partageSite(), policesPartage()]);
  return new ImageResponse(<ImagePartage d={d} />, { ...TAILLE_PARTAGE, fonts: polices, headers: { "Cache-Control": d.prive ? "private, no-store" : "public, max-age=3600" } });
}
