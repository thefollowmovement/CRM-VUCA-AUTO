import { KeyRound } from "lucide-react";
import { BientotOnglet } from "@/components/vehicules/bientot-onglet";

export const metadata = { title: "Location" };

export default function PageLocationVehicule() {
  return <BientotOnglet icone={KeyRound} titre="Location" phase={4} description="Contrats, calendrier du véhicule, taux d'occupation et revenus." />;
}
