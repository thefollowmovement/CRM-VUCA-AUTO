import type { LucideIcon } from "lucide-react";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { EtatVide } from "@/components/ui/etat-vide";

/** Page provisoire d'un module qui arrive dans une phase suivante. */
export function Bientot({
  titre,
  icone,
  phase,
  description,
}: {
  titre: string;
  icone: LucideIcon;
  phase: number;
  description: string;
}) {
  return (
    <>
      <EnTetePage titre={titre} />
      <EtatVide icone={icone} titre={`Disponible en Phase ${phase}`} description={description} />
    </>
  );
}
