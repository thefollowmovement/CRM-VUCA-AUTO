// Icône d'onglet par défaut (512 × 512, PNG) : carré couleur d'accent et « V » de route.
// Utilisée tant qu'aucune icône n'est choisie dans le CRM (Site web → Général).
import { ImageResponse } from "next/og";
import { TRACE_V } from "@/components/site/logo";
import { reglagesPublics } from "@/server/site/public";

export async function GET() {
  const r = await reglagesPublics();
  return new ImageResponse(
    (
      <svg width="512" height="512" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill={r.accent} />
        <rect x="6" y="24" width="8" height="3.5" rx="1.75" fill={r.surAccent} />
        <rect x="4" y="32" width="10" height="3.5" rx="1.75" fill={r.surAccent} />
        <path d={TRACE_V} fill={r.surAccent} />
      </svg>
    ),
    { width: 512, height: 512, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
