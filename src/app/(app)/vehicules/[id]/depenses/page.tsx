import { Receipt } from "lucide-react";
import { BientotOnglet } from "@/components/vehicules/bientot-onglet";

export const metadata = { title: "Dépenses" };

export default function PageDepensesVehicule() {
  return <BientotOnglet icone={Receipt} titre="Dépenses" phase={3} description="Liste des dépenses, totaux par catégorie et par payeur, ajout rapide depuis le téléphone." />;
}
