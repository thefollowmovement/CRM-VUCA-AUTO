import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { Bientot } from "@/components/layout/bientot";

export const metadata: Metadata = { title: "Dépenses" };

export default function PageDepenses() {
  return (
    <Bientot
      titre="Dépenses"
      icone={Receipt}
      phase={3}
      description="Toutes les dépenses par véhicule, catégorie et payeur, avec saisie rapide depuis le téléphone."
    />
  );
}
