import { Globe } from "lucide-react";
import type { Metadata } from "next";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { urlSite } from "@/lib/domaines";

export const metadata: Metadata = { title: "Aperçu du site" };

/** Aperçu du site public dans le CRM (connexion exigée). Démonstration des composants en Phase S2. */
export default function PageApercuSite() {
  const adresse = urlSite("/");
  return (
    <>
      <EnTetePage titre="Aperçu du site" description="La démonstration des composants du site arrivera ici (Phase S2)." />
      <EtatVide
        icone={Globe}
        titre="Site public"
        description={adresse.startsWith("http") ? `Adresse publique : ${adresse}` : "Domaine du site non configuré (SITE_DOMAIN)."}
      />
    </>
  );
}
