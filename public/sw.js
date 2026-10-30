// Service worker de VUCA AUTO CRM (application installable).
// Volontairement minimal : aucune donnée de l'application n'est mise en cache
// (elles sont privées et doivent toujours être à jour). On garde seulement
// les fichiers techniques de Next.js et une page « hors connexion ».
const CACHE = "vuca-crm-v2";
const HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([HORS_LIGNE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages : toujours le réseau ; sans connexion → page « hors connexion »
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(HORS_LIGNE)));
    return;
  }
  // Fichiers techniques versionnés de Next.js : cache d'abord (ils ne changent jamais)
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((rep) => {
            if (rep.ok) {
              const copie = rep.clone();
              caches.open(CACHE).then((c) => c.put(req, copie));
            }
            return rep;
          }),
      ),
    );
  }
  // Tout le reste (API, fichiers, PDF) : réseau uniquement, rien n'est stocké
});
