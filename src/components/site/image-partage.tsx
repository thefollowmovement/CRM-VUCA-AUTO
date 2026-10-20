// Gabarit des images de partage (1200 × 630), rendu par next/og : styles en ligne uniquement.
import type { DonneesPartage } from "@/server/site/partage";

export const TAILLE_PARTAGE = { width: 1200, height: 630 };

export function ImagePartage({ d }: { d: DonneesPartage }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "Inter", color: "#1d1d1f" }}>
      {d.photo && (
        <div style={{ display: "flex", width: 680, height: 630, position: "relative" }}>
          <img src={d.photo} alt="" width={680} height={630} style={{ width: 680, height: 630, objectFit: "cover" }} />
          {d.badge && (
            <div style={{ position: "absolute", top: 36, left: 36, display: "flex", padding: "10px 22px", borderRadius: 999, background: d.badge === "Vendu" ? "#e8e8ed" : "#fff1e0", color: d.badge === "Vendu" ? "#515154" : "#9a4a00", fontSize: 28, fontWeight: 700 }}>
              {d.badge}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: d.photo ? "56px 52px" : "72px 88px", background: d.photo ? "#ffffff" : "#f5f5f7" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {d.logo ? (
            <img src={d.logo} alt="" height={56} style={{ height: 56, maxWidth: 300, objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>{d.nom}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: d.photo ? 56 : 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{d.titre}</div>
          {d.sousTitre && <div style={{ display: "flex", marginTop: 18, fontSize: d.photo ? 26 : 34, color: "#6e6e73", lineHeight: 1.3 }}>{d.sousTitre}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {d.prix ? <div style={{ display: "flex", fontSize: 60, fontWeight: 700, letterSpacing: -2 }}>{d.prix}</div> : <div style={{ display: "flex" }} />}
          {d.whatsapp && <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", borderRadius: 999, background: "#25d366", color: "#052e16", fontSize: 24, fontWeight: 700 }}>WhatsApp</div>}
        </div>
      </div>
    </div>
  );
}
