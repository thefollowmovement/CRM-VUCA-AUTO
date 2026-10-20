"use client";

import { usePathname } from "next/navigation";
import { WhatsappFlottant } from "./whatsapp";

/** Bouton flottant sur toutes les pages, masqué sur mobile dans une fiche véhicule (qui a sa propre barre). */
export function WhatsappFlottantSite({ lien }: { lien: string }) {
  const chemin = usePathname();
  const fiche = /\/voitures\/[^/]+$/.test(chemin);
  return <WhatsappFlottant lien={lien} masquerMobile={fiche} />;
}
