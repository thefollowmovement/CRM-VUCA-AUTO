"use client";

import { Eraser } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type PadSignatureRef = { vide: () => boolean; versFichier: (nom: string) => Promise<File | null>; effacer: () => void };

/**
 * Zone de signature au doigt (ou à la souris / au stylet). Trait noir sur fond
 * transparent, exporté en PNG. Pas de dépendance externe.
 */
export const PadSignature = forwardRef<PadSignatureRef, { libelle: string; onChange?: (vide: boolean) => void }>(function PadSignature({ libelle, onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessin = useRef(false);
  const dernier = useRef<{ x: number; y: number } | null>(null);
  const [vide, setVide] = useState(true);

  // Taille réelle du canevas = taille affichée × densité de l'écran (trait net sur téléphone)
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let largeur = 0;
    const ajuster = () => {
      const r = c.getBoundingClientRect();
      // Sur téléphone, le défilement (barre d'adresse qui se replie) déclenche « resize » :
      // on ne touche au cadre que si sa largeur change vraiment (rotation…).
      if (Math.round(r.width) === largeur || r.width === 0) return;
      const premiere = largeur === 0;
      largeur = Math.round(r.width);
      // Copie du dessin en cours, pour le redessiner à la nouvelle taille
      let copie: HTMLCanvasElement | null = null;
      if (!premiere && c.width > 0) {
        copie = document.createElement("canvas");
        copie.width = c.width;
        copie.height = c.height;
        copie.getContext("2d")?.drawImage(c, 0, 0);
      }
      const ratio = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * ratio);
      c.height = Math.round(r.height * ratio);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      if (copie) ctx.drawImage(copie, 0, 0, c.width, c.height);
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      if (premiere) {
        setVide(true);
        onChange?.(true);
      }
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const debut = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dessin.current = true;
    dernier.current = point(e);
    const ctx = e.currentTarget.getContext("2d");
    const p = dernier.current;
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
    }
  };
  const bouger = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dessin.current || !dernier.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(dernier.current.x, dernier.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    dernier.current = p;
    if (vide) {
      setVide(false);
      onChange?.(false);
    }
  };
  const fin = () => {
    dessin.current = false;
    dernier.current = null;
  };
  const effacer = () => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setVide(true);
    onChange?.(true);
  };

  useImperativeHandle(ref, () => ({
    vide: () => vide,
    effacer,
    versFichier: (nom) =>
      new Promise((ok) => {
        if (!canvas.current || vide) return ok(null);
        canvas.current.toBlob((b) => ok(b ? new File([b], nom, { type: "image/png" }) : null), "image/png");
      }),
  }));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{libelle}</span>
        <Button type="button" variant="ghost" size="sm" onClick={effacer} disabled={vide}>
          <Eraser /> Effacer
        </Button>
      </div>
      <canvas
        ref={canvas}
        aria-label={libelle}
        data-vide={vide ? "oui" : "non"}
        onPointerDown={debut}
        onPointerMove={bouger}
        onPointerUp={fin}
        onPointerCancel={fin}
        className="h-40 w-full touch-none rounded-lg border-2 border-dashed bg-white"
      />
      <span className="text-xs text-muted-foreground">{vide ? "Signez dans le cadre avec le doigt." : "Signature enregistrée à la validation."}</span>
    </div>
  );
});
