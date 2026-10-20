"use client";

import { ChevronLeft, ChevronRight, Expand, X, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SourcePhoto } from "@/lib/site/photos";
import { cn } from "@/lib/utils";

export type PhotoGalerie = SourcePhoto & { alt: string; miniature: string };

/** Index de la diapositive visible d'après le défilement horizontal. */
const indexVisible = (el: HTMLElement) => Math.round(el.scrollLeft / Math.max(1, el.clientWidth));

/**
 * Pendant un défilement commandé (flèche, vignette), le compteur affiche la photo VISÉE :
 * les positions intermédiaires de l'animation sont ignorées jusqu'à l'arrivée.
 */
function suivreDefilement(el: HTMLElement, cible: React.RefObject<number | null>, setIndex: (i: number) => void) {
  if (cible.current !== null) {
    if (Math.abs(el.scrollLeft - cible.current * el.clientWidth) > 2) return;
    cible.current = null;
  }
  setIndex(indexVisible(el));
}

function BoutonRond({ libelle, onClick, className, children, sombre }: { libelle: string; onClick: () => void; className?: string; children: React.ReactNode; sombre?: boolean }) {
  return (
    <button
      type="button"
      aria-label={libelle}
      onClick={onClick}
      className={cn(
        "s-transition inline-flex size-11 items-center justify-center rounded-full shadow-site transition-[background-color,opacity] [&_svg]:size-5",
        sombre ? "bg-white/15 text-white hover:bg-white/25" : "bg-site-carte/90 text-site-texte hover:bg-site-carte",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Galerie de la fiche : grande photo qui défile au doigt (scroll-snap), compteur « 3 / 14 »,
 * flèches sur ordinateur, vignettes, plein écran avec zoom (double-toucher ou bouton) et clavier.
 */
export function Galerie({ photos, titre }: { photos: PhotoGalerie[]; titre: string }) {
  const piste = useRef<HTMLDivElement>(null);
  const cible = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [pleinEcran, setPleinEcran] = useState(false);
  const total = photos.length;

  const allerA = useCallback((i: number, instantane = false) => {
    const element = piste.current;
    if (!element) return;
    const visee = Math.max(0, Math.min(total - 1, i));
    const doux = !instantane && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cible.current = doux ? visee : null;
    element.scrollTo({ left: visee * element.clientWidth, behavior: doux ? "smooth" : "auto" });
    setIndex(visee);
  }, [total]);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3" aria-roledescription="galerie" aria-label={`Photos : ${titre}`}>
      <div className="group relative overflow-hidden rounded-carte bg-site-fond-alt">
        <div
          ref={piste}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => suivreDefilement(e.currentTarget, cible, setIndex)}
          tabIndex={0}
          aria-label="Photos, utilisez les flèches pour changer"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); allerA(index + 1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); allerA(index - 1); }
            if (e.key === "Enter") setPleinEcran(true);
          }}
        >
          {photos.map((p, i) => (
            <button key={p.src} type="button" className="relative aspect-[4/3] w-full shrink-0 snap-center snap-always" onClick={() => setPleinEcran(true)} aria-label={`Agrandir la photo ${i + 1}`} tabIndex={-1}>
              <img src={p.src} srcSet={p.srcSet} sizes="(min-width: 1024px) 760px, 100vw" alt={p.alt} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async" className="absolute inset-0 size-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
        <span className="s-chiffres pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[13px] font-semibold text-white" aria-live="polite">
          {index + 1} / {total}
        </span>
        <BoutonRond libelle="Plein écran" onClick={() => setPleinEcran(true)} className="absolute right-3 top-3">
          <Expand strokeWidth={1.75} />
        </BoutonRond>
        {total > 1 && (
          <>
            <BoutonRond libelle="Photo précédente" onClick={() => allerA(index - 1)} className={cn("absolute left-3 top-1/2 hidden -translate-y-1/2 md:inline-flex", index === 0 && "md:hidden")}>
              <ChevronLeft strokeWidth={1.75} />
            </BoutonRond>
            <BoutonRond libelle="Photo suivante" onClick={() => allerA(index + 1)} className={cn("absolute right-3 top-1/2 hidden -translate-y-1/2 md:inline-flex", index === total - 1 && "md:hidden")}>
              <ChevronRight strokeWidth={1.75} />
            </BoutonRond>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Vignettes">
          {photos.map((p, i) => (
            <li key={p.src} className="shrink-0">
              <button
                type="button"
                onClick={() => allerA(i)}
                aria-label={`Voir la photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn("s-transition block h-14 w-[4.67rem] overflow-hidden rounded-[10px] transition-opacity md:h-16 md:w-[5.33rem]", i === index ? "opacity-100 ring-2 ring-site-accent ring-offset-2 ring-offset-site-fond" : "opacity-60 hover:opacity-100")}
              >
                <img src={p.miniature} alt="" loading="lazy" decoding="async" className="size-full object-cover" draggable={false} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <PleinEcran
        photos={photos}
        ouvert={pleinEcran}
        indexDepart={index}
        onFermer={(dernier) => {
          setPleinEcran(false);
          // Après la fermeture (la page retrouve son défilement) : on se place sur la dernière photo vue
          setTimeout(() => allerA(dernier, true), 60);
        }}
      />
    </div>
  );
}

/** Plein écran : fond noir, défilement, clavier (← → Échap), zoom ×2.5 avec déplacement au doigt. */
function PleinEcran({ photos, ouvert, indexDepart, onFermer }: { photos: PhotoGalerie[]; ouvert: boolean; indexDepart: number; onFermer: (index: number) => void }) {
  const [conteneur, setConteneur] = useState<HTMLElement | null>(null);
  const piste = useRef<HTMLDivElement>(null);
  const cible = useRef<number | null>(null);
  const [index, setIndex] = useState(indexDepart);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const dernierToucher = useRef(0);
  const total = photos.length;

  useEffect(() => setConteneur(document.querySelector<HTMLElement>(".site")), []);
  const positionnee = useRef(false);
  useEffect(() => {
    if (!ouvert) return;
    setIndex(indexDepart);
    setZoom(null);
    positionnee.current = false;
    // Position de départ sans animation, dès que la piste a sa largeur (le portail s'affiche en différé)
    let image = 0;
    const positionner = () => {
      const el = piste.current;
      if (!el || el.clientWidth === 0) {
        image = requestAnimationFrame(positionner);
        return;
      }
      el.scrollLeft = indexDepart * el.clientWidth;
      positionnee.current = true;
    };
    positionner();
    return () => cancelAnimationFrame(image);
  }, [ouvert, indexDepart]);

  const aller = (i: number) => {
    const el = piste.current;
    if (!el) return;
    const visee = Math.max(0, Math.min(total - 1, i));
    setZoom(null);
    setDecalage({ x: 0, y: 0 });
    cible.current = visee;
    el.scrollTo({ left: visee * el.clientWidth, behavior: "smooth" });
    setIndex(visee);
  };
  const basculerZoom = (e?: { clientX: number; clientY: number; currentTarget: Element }) => {
    if (zoom) {
      setZoom(null);
      setDecalage({ x: 0, y: 0 });
      return;
    }
    // Zoom : on se cale exactement sur la photo affichée (même si une animation était en cours)
    const el = piste.current;
    if (el) {
      cible.current = null;
      el.scrollTo({ left: index * el.clientWidth, behavior: "auto" });
    }
    if (!e) return setZoom({ x: 50, y: 50 });
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <D.Root open={ouvert} onOpenChange={(o) => !o && onFermer(index)}>
      <D.Portal container={conteneur ?? undefined}>
        <D.Content
          className="fixed inset-0 z-[60] flex flex-col bg-black text-white outline-none"
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") aller(index + 1);
            if (e.key === "ArrowLeft") aller(index - 1);
          }}
        >
          <D.Title className="sr-only">Photos en plein écran</D.Title>
          <div className="flex items-center justify-between gap-3 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <span className="s-chiffres px-2 text-[15px] font-semibold" aria-live="polite">
              {index + 1} / {total}
            </span>
            <div className="flex gap-2">
              <BoutonRond sombre libelle={zoom ? "Dézoomer" : "Zoomer"} onClick={() => basculerZoom()}>
                {zoom ? <ZoomOut strokeWidth={1.75} /> : <ZoomIn strokeWidth={1.75} />}
              </BoutonRond>
              <D.Close asChild>
                <BoutonRond sombre libelle="Fermer" onClick={() => undefined}>
                  <X strokeWidth={1.75} />
                </BoutonRond>
              </D.Close>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              ref={piste}
              className={cn("flex h-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", zoom ? "overflow-hidden" : "overflow-x-auto")}
              onScroll={(e) => positionnee.current && !zoom && suivreDefilement(e.currentTarget, cible, setIndex)}
            >
              {photos.map((p, i) => (
                <div key={p.src} className="flex h-full w-full shrink-0 snap-center items-center justify-center overflow-hidden">
                  <img
                    src={p.src}
                    srcSet={p.srcSet}
                    sizes="100vw"
                    alt={p.alt}
                    loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    className={cn("max-h-full max-w-full touch-pan-x select-none object-contain transition-transform duration-300 ease-site", zoom && i === index && "cursor-grab touch-none")}
                    style={zoom && i === index ? { transform: `translate(${decalage.x}px, ${decalage.y}px) scale(2.5)`, transformOrigin: `${zoom.x}% ${zoom.y}%`, transitionDuration: glisse.current ? "0ms" : undefined } : undefined}
                    onDoubleClick={(e) => basculerZoom(e)}
                    onPointerDown={(e) => {
                      // Double-toucher sur mobile
                      const maintenant = Date.now();
                      if (e.pointerType === "touch" && maintenant - dernierToucher.current < 300) basculerZoom(e);
                      dernierToucher.current = maintenant;
                      if (zoom) {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        glisse.current = { x: e.clientX, y: e.clientY, dx: decalage.x, dy: decalage.y };
                      }
                    }}
                    onPointerMove={(e) => {
                      const g = glisse.current;
                      if (g && zoom) setDecalage({ x: g.dx + (e.clientX - g.x), y: g.dy + (e.clientY - g.y) });
                    }}
                    onPointerUp={() => (glisse.current = null)}
                    onPointerCancel={() => (glisse.current = null)}
                  />
                </div>
              ))}
            </div>
            {total > 1 && !zoom && (
              <>
                <BoutonRond sombre libelle="Photo précédente" onClick={() => aller(index - 1)} className={cn("absolute left-3 top-1/2 hidden -translate-y-1/2 md:inline-flex", index === 0 && "md:invisible")}>
                  <ChevronLeft strokeWidth={1.75} />
                </BoutonRond>
                <BoutonRond sombre libelle="Photo suivante" onClick={() => aller(index + 1)} className={cn("absolute right-3 top-1/2 hidden -translate-y-1/2 md:inline-flex", index === total - 1 && "md:invisible")}>
                  <ChevronRight strokeWidth={1.75} />
                </BoutonRond>
              </>
            )}
          </div>
          <p className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 text-center text-[13px] text-white/60">Double-touchez une photo pour zoomer</p>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
