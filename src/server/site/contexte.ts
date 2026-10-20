// Contexte d'une page du site : vue normale (vuca-auto.fr) ou aperçu depuis le CRM (/apercu-site).
import { headers } from "next/headers";
import { ENTETE_APERCU, PREFIXE_APERCU } from "@/lib/domaines";
import { cheminsSite } from "@/lib/site/chemins";

/** L'en-tête n'est posé que par le middleware, après contrôle de la connexion au CRM. */
export async function contexteSite() {
  const apercu = (await headers()).get(ENTETE_APERCU) === "1";
  return { apercu, chemins: cheminsSite(apercu ? PREFIXE_APERCU : "") };
}
