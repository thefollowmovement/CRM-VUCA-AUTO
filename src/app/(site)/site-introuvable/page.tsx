import { notFound } from "next/navigation";

// Cible des réécritures « introuvable » du middleware sur vuca-auto.fr : renvoie la 404 du site.
export default function SiteIntrouvable() {
  notFound();
}
