"use client";

import { useEffect } from "react";

/** Enregistre le service worker (application installable), en production seulement. */
export function EnregistrementSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sans service worker, l'application fonctionne normalement (simplement pas hors connexion).
    });
  }, []);
  return null;
}
