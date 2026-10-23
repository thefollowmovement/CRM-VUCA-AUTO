"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Rafraîchit la page du lot toutes les 3 s tant que des pages restent à lire. */
export function RafraichissementAuto({ actif }: { actif: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!actif) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [actif, router]);
  return null;
}
