// Gabarit des images de partage (1200 × 630), rendu par next/og : styles en ligne uniquement.
// Identité S7 : fond nuit, titres condensés en majuscules, prix en étiquette couleur d'accent.
import type { DonneesPartage } from "@/server/site/partage";
import { decouperNom, TRACE_V } from "./logo";

export const TAILLE_PARTAGE = { width: 1200, height: 630 };

const NUIT = "#0a0a0b";

export function ImagePartage({ d }: { d: DonneesPartage }) {
  const [debut, fin] = decouperNom(d.nom);
  const surAccent = d.surAccent ?? NUIT;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: NUIT, fontFamily: "Inter", color: "#f5f5f7" }}>
      {d.photo && (
        <div style={{ display: "flex", width: 680, height: 630, position: "relative" }}>
          <img src={d.photo} alt="" width={680} height={630} style={{ width: 680, height: 630, objectFit: "cover" }} />
          {d.badge && (
            <div style={{ position: "absolute", top: 36, left: 36, display: "flex", padding: "10px 22px", borderRadius: 14, background: d.badge === "Vendu" ? "#2c2c2e" : "#3a2410", color: d.badge === "Vendu" ? "#c7c7cc" : "#ffb066", fontSize: 28, fontWeight: 700 }}>
              {d.badge}
            </div>
          )}
          {d.prix && (
            <div style={{ position: "absolute", right: 32, bottom: 32, display: "flex", padding: "12px 22px", borderRadius: 16, background: d.accent, color: surAccent, fontFamily: "Archivo Narrow", fontSize: 58, fontWeight: 700, transform: "rotate(-3deg)" }}>
              {d.prix}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: d.photo ? "56px 52px" : "72px 88px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {d.logo ? (
            <img src={d.logo} alt="" height={56} style={{ height: 56, maxWidth: 300, objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <svg width="60" height="60" viewBox="0 0 64 64">
                <rect width="64" height="64" rx="16" fill={d.accent} />
                <rect x="6" y="24" width="8" height="3.5" rx="1.75" fill={surAccent} />
                <rect x="4" y="32" width="10" height="3.5" rx="1.75" fill={surAccent} />
                <path d={TRACE_V} fill={surAccent} />
              </svg>
              <div style={{ display: "flex", marginLeft: 16, fontFamily: "Archivo Narrow", fontSize: 46, fontWeight: 700, textTransform: "uppercase" }}>
                {debut}
                {fin && <span style={{ color: d.accent }}>{fin}</span>}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Archivo Narrow", fontSize: d.photo ? 64 : 88, fontWeight: 700, lineHeight: 0.95, textTransform: "uppercase" }}>{d.titre}</div>
          {d.sousTitre && <div style={{ display: "flex", marginTop: 20, fontSize: d.photo ? 26 : 32, color: "#a1a1a6", lineHeight: 1.3 }}>{d.sousTitre}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: d.photo ? "flex-end" : "space-between" }}>
          {!d.photo && <div style={{ display: "flex", width: 160, height: 8, borderRadius: 8, background: d.accent }} />}
          {d.whatsapp && <div style={{ display: "flex", alignItems: "center", padding: "14px 26px", borderRadius: 14, background: "#25d366", color: "#052e16", fontSize: 26, fontWeight: 700 }}>WhatsApp</div>}
        </div>
      </div>
    </div>
  );
}
