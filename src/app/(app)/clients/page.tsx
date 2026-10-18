import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Bientot } from "@/components/layout/bientot";

export const metadata: Metadata = { title: "Clients" };

export default function PageClients() {
  return (
    <Bientot
      titre="Clients"
      icone={Users}
      phase={4}
      description="Fiches clients, permis, pièces d'identité, historique des locations et liste noire."
    />
  );
}
