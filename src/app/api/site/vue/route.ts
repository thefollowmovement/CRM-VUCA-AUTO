// Compteur de vues du site public (page vue, annonce vue). Voir server/site/compteurs.ts.
import { traiterCompteur } from "@/server/site/route-compteur";

export function POST(requete: Request) {
  return traiterCompteur(requete, ["VUE_SITE", "VUE_ANNONCE"]);
}
