import { Car } from "lucide-react";
import type { Metadata } from "next";
import { Bientot } from "@/components/layout/bientot";

export const metadata: Metadata = { title: "Véhicules" };

export default function PageVehicules() {
  return (
    <Bientot
      titre="Véhicules"
      icone={Car}
      phase={2}
      description="Liste en tableau et en cartes, fiche véhicule, photos, documents, financement et statuts."
    />
  );
}
