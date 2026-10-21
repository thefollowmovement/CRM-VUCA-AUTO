"use client";

import { useEffect, useRef } from "react";

/**
 * Îlot client : remplace la voiture dessinée par la voiture 3D, uniquement sur ordinateur
 * (grand écran + souris), si l'appareil accepte les animations et sans « économie de données ».
 * Chargée après la page (le moteur three.js est un fichier séparé), jamais sur téléphone :
 * la voiture dessinée reste alors affichée (et sert de secours si WebGL est indisponible).
 */
export function Voiture3D() {
  const toile = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = toile.current;
    const scene = canvas?.parentElement;
    if (!canvas || !scene) return;
    const capable = window.matchMedia("(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)").matches;
    const economie = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!capable || economie) return;

    let arreter: (() => void) | null = null;
    let annule = false;
    const lancer = async () => {
      try {
        const { demarrerVoiture3d } = await import("./voiture-3d-moteur");
        if (annule) return;
        const accent = getComputedStyle(scene).getPropertyValue("--site-accent").trim() || "#ffd60a";
        arreter = demarrerVoiture3d(canvas, scene, { accent }).arreter;
        scene.dataset.voiture3d = "pret";
      } catch {
        // WebGL indisponible : la voiture dessinée reste affichée
      }
    };
    // Après le chargement de la page, quand le navigateur est disponible
    const differer = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => void lancer(), { timeout: 2500 });
      else setTimeout(() => void lancer(), 1200);
    };
    if (document.readyState === "complete") differer();
    else window.addEventListener("load", differer, { once: true });
    return () => {
      annule = true;
      window.removeEventListener("load", differer);
      arreter?.();
      delete scene.dataset.voiture3d;
    };
  }, []);
  return <canvas ref={toile} className="s-voiture-3d pointer-events-none absolute inset-0 size-full" aria-hidden />;
}
