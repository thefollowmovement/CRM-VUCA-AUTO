"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Apparition douce au défilement (fondu + léger glissement).
 * Sans JavaScript ou avec « réduire les animations », le contenu est simplement affiché.
 */
export function Apparition({ children, className, delai = 0 }: { children: React.ReactNode; className?: string; delai?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [actif, setActif] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    // Déjà à l'écran au chargement : pas d'animation (évite un clignotement)
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setActif(true);
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn(actif && "s-apparition", className)} data-visible={visible ? "oui" : "non"} style={actif && delai ? { transitionDelay: `${delai}ms` } : undefined}>
      {children}
    </div>
  );
}
