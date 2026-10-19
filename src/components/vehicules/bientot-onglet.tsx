import type { LucideIcon } from "lucide-react";
import { EtatVide } from "@/components/ui/etat-vide";

export function BientotOnglet({ icone, titre, phase, description }: { icone: LucideIcon; titre: string; phase: number; description: string }) {
  return <EtatVide icone={icone} titre={`${titre} — Phase ${phase}`} description={description} />;
}
