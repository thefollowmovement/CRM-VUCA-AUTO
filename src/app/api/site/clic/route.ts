// Compteur de clics « Écrire sur WhatsApp » et « Appeler ». Voir server/site/compteurs.ts.
import { traiterCompteur } from "@/server/site/route-compteur";

export function POST(requete: Request) {
  return traiterCompteur(requete, ["CLIC_WHATSAPP", "CLIC_APPEL"]);
}
