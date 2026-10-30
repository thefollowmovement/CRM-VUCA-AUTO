"use client";

import { useState } from "react";
import { COULEURS_GRAVITE, LIBELLES_VUE, SCHEMA, VUES, type Gravite, type Vue, type Zone } from "@/lib/schema-vehicule";
import { cn } from "@/lib/utils";

export type MarqueDommage = { id: string; vue: Vue; positionX: number | null; positionY: number | null; gravite: Gravite; numero: number; nouveau?: boolean };

function Forme({ zone, ...props }: { zone: Zone } & React.SVGProps<SVGElement>) {
  const f = zone.forme;
  if ("rect" in f) {
    const [x, y, width, height, rx] = f.rect;
    return <rect x={x} y={y} width={width} height={height} rx={rx ?? 0} {...(props as React.SVGProps<SVGRectElement>)} />;
  }
  if ("cercle" in f) return <circle cx={f.cercle[0]} cy={f.cercle[1]} r={f.cercle[2]} {...(props as React.SVGProps<SVGCircleElement>)} />;
  return <polygon points={f.poly.map((p) => p.join(",")).join(" ")} {...(props as React.SVGProps<SVGPolygonElement>)} />;
}

/**
 * Schéma du véhicule : l'utilisateur touche une zone pour signaler un dommage.
 * Les dommages déjà connus sont affichés en pastilles numérotées (rouge cerclé = nouveau).
 */
export function SchemaVehicule({
  dommages,
  onToucher,
  vueInitiale = "COTE_GAUCHE",
}: {
  dommages: MarqueDommage[];
  onToucher?: (vue: Vue, zone: string, x: number, y: number) => void;
  vueInitiale?: Vue;
}) {
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [survol, setSurvol] = useState<string | null>(null);
  const def = SCHEMA[vue];
  const marques = dommages.filter((d) => d.vue === vue);

  const toucher = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onToucher) return;
    const cible = (e.target as Element).closest("[data-zone]");
    const zone = cible?.getAttribute("data-zone");
    if (!zone) return;
    // Coordonnées dans le repère du SVG → position relative 0–1
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    onToucher(vue, zone, Math.min(1, Math.max(0, p.x / def.largeur)), Math.min(1, Math.max(0, p.y / def.hauteur)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Vue du véhicule">
        {VUES.map((v) => {
          const n = dommages.filter((d) => d.vue === v).length;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === vue}
              onClick={() => setVue(v)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm",
                v === vue ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {LIBELLES_VUE[v]}
              {n > 0 && <span className={cn("rounded-full px-1.5 text-xs", v === vue ? "bg-primary-foreground/20" : "bg-muted")}>{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="rounded-xl border bg-muted/30 p-2">
        <svg
          viewBox={`0 0 ${def.largeur} ${def.hauteur}`}
          className={cn("mx-auto block max-h-[52vh] w-full touch-manipulation select-none", onToucher && "cursor-crosshair")}
          onPointerUp={toucher}
          role="img"
          aria-label={`Schéma ${LIBELLES_VUE[vue].toLowerCase()}`}
        >
          <path d={def.silhouette} className="fill-card stroke-muted-foreground/40" strokeWidth={2} />
          {def.zones.map((z) => (
            <Forme
              key={z.id}
              zone={z}
              data-zone={z.id}
              aria-label={z.libelle}
              onPointerEnter={() => setSurvol(z.libelle)}
              onPointerLeave={() => setSurvol(null)}
              className={cn("fill-primary/[0.04] stroke-muted-foreground/50 transition-colors", onToucher && "hover:fill-primary/15 active:fill-primary/25")}
              strokeWidth={1.2}
            />
          ))}
          {marques.map((d) => {
            const x = (d.positionX ?? 0.5) * def.largeur;
            const y = (d.positionY ?? 0.5) * def.hauteur;
            return (
              <g key={d.id} pointerEvents="none">
                {d.nouveau && <circle cx={x} cy={y} r={15} fill="none" stroke="#dc2626" strokeWidth={2.5} strokeDasharray="4 3" />}
                <circle cx={x} cy={y} r={10} fill={COULEURS_GRAVITE[d.gravite]} stroke="white" strokeWidth={2} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="white">
                  {d.numero}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 h-5 text-center text-xs text-muted-foreground">
          {survol ?? (onToucher ? "Touchez l'endroit abîmé pour ajouter un dommage." : "")}
        </p>
      </div>
    </div>
  );
}
