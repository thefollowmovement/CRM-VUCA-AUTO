"use client";

import { Crop, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { borner, largeurMaxCadre, recadrageParDefaut, type Recadrage } from "@/lib/site/recadrage";
import { recadrerPhoto } from "@/server/actions/annonces";

/** Aperçu 4:3 d'une photo avec son recadrage (sans recadrage : cadre centré). */
export function ApercuRecadre({ id, largeur, hauteur, recadrage, alt, className }: { id: string; largeur: number | null; hauteur: number | null; recadrage: Recadrage | null; alt: string; className?: string }) {
  const src = `/api/fichiers/${id}?taille=mini`;
  if (!largeur || !hauteur) {
    return (
      <div className={`relative aspect-[4/3] overflow-hidden bg-muted ${className ?? ""}`}>
        <img src={src} alt={alt} className="size-full object-cover" loading="lazy" draggable={false} />
      </div>
    );
  }
  const r = borner(recadrage ?? recadrageParDefaut(largeur, hauteur), largeur, hauteur);
  // Image agrandie pour que le cadre remplisse la vignette, puis décalée vers le coin du cadre
  const style = {
    width: `${10000 / r.l}%`,
    left: `${(-r.x / r.l) * 100}%`,
    top: `${((-r.y * hauteur) / (r.l * largeur * 0.75)) * 100}%`,
  };
  return (
    <div className={`relative aspect-[4/3] overflow-hidden bg-muted ${className ?? ""}`}>
      <img src={src} alt={alt} className="absolute max-w-none" style={style} loading="lazy" draggable={false} />
    </div>
  );
}

/** Fenêtre de recadrage : cadre 4:3 à déplacer au doigt + curseur de taille. */
export function RecadragePhoto({
  photo,
  ouvert,
  onFermer,
}: {
  photo: { id: string; largeur: number; hauteur: number; recadrage: Recadrage | null };
  ouvert: boolean;
  onFermer: () => void;
}) {
  const router = useRouter();
  const { largeur: W, hauteur: H } = photo;
  const [r, setR] = useState<Recadrage>(() => borner(photo.recadrage ?? recadrageParDefaut(W, H), W, H));
  const [enCours, setEnCours] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const glisse = useRef<{ px: number; py: number; depart: Recadrage } | null>(null);
  const lMax = largeurMaxCadre(W, H);
  const lMin = Math.min(30, lMax);
  const hauteurCadre = ((r.l / 100) * W * 0.75) / H * 100; // en % de la hauteur

  const deplacer = (e: React.PointerEvent) => {
    const g = glisse.current;
    const boite = zone.current?.getBoundingClientRect();
    if (!g || !boite) return;
    const dx = ((e.clientX - g.px) / boite.width) * 100;
    const dy = ((e.clientY - g.py) / boite.height) * 100;
    setR(borner({ ...g.depart, x: g.depart.x + dx, y: g.depart.y + dy }, W, H));
  };

  // Changer la taille garde le centre du cadre au même endroit
  const redimensionner = (l: number) => {
    const cx = r.x + r.l / 2;
    const cy = r.y + hauteurCadre / 2;
    const h = ((l / 100) * W * 0.75) / H * 100;
    setR(borner({ l, x: cx - l / 2, y: cy - h / 2 }, W, H));
  };

  const enregistrer = async (valeur: Recadrage | null) => {
    setEnCours(true);
    const arrondi = valeur && { x: Math.round(valeur.x * 100) / 100, y: Math.round(valeur.y * 100) / 100, l: Math.round(valeur.l * 100) / 100 };
    if (traiterResultat(await recadrerPhoto(photo.id, arrondi))) {
      onFermer();
      router.refresh();
    }
    setEnCours(false);
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recadrer la photo (format 4:3)</DialogTitle>
          <DialogDescription>Faites glisser le cadre sur la partie à montrer. La photo d&apos;origine n&apos;est pas modifiée.</DialogDescription>
        </DialogHeader>
        <div ref={zone} className="relative w-full touch-none select-none overflow-hidden rounded-lg bg-muted" style={{ aspectRatio: `${W} / ${H}` }}>
          <img src={`/api/fichiers/${photo.id}`} alt="Photo à recadrer" className="absolute inset-0 size-full" draggable={false} />
          <div
            role="slider"
            aria-label="Position du cadre"
            aria-valuetext={`${Math.round(r.x)} %, ${Math.round(r.y)} %`}
            tabIndex={0}
            className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] outline-none focus-visible:border-primary"
            style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.l}%`, height: `${hauteurCadre}%` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              glisse.current = { px: e.clientX, py: e.clientY, depart: r };
            }}
            onPointerMove={deplacer}
            onPointerUp={() => (glisse.current = null)}
            onPointerCancel={() => (glisse.current = null)}
            onKeyDown={(e) => {
              const pas = e.shiftKey ? 5 : 1;
              const d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[e.key];
              if (!d) return;
              e.preventDefault();
              setR(borner({ ...r, x: r.x + d[0]!, y: r.y + d[1]! }, W, H));
            }}
          >
            {/* Repères des tiers */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="border border-white/30" />
              ))}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span className="shrink-0">Zoom</span>
          <input
            type="range"
            min={lMin}
            max={lMax}
            step={0.5}
            // Curseur « zoom » : plus on avance, plus le cadre est petit
            value={lMax + lMin - r.l}
            onChange={(e) => redimensionner(lMax + lMin - Number(e.target.value))}
            className="h-11 w-full accent-primary"
            aria-label="Zoom"
          />
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => enregistrer(null)} disabled={enCours}>
            <RotateCcw /> Cadrage automatique
          </Button>
          <Button type="button" onClick={() => enregistrer(r)} disabled={enCours}>
            {enCours ? <LoaderCircle className="animate-spin" /> : <Crop />} Enregistrer le recadrage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
