import { ShieldAlert } from "lucide-react";
import { BientotOnglet } from "@/components/vehicules/bientot-onglet";

export const metadata = { title: "Dommages" };

export default function PageDommagesVehicule() {
  return <BientotOnglet icone={ShieldAlert} titre="Dommages" phase={5} description="Dommages connus sur le schéma du véhicule et historique, alimentés par les états des lieux." />;
}
