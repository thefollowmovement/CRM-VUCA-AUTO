import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { Bientot } from "@/components/layout/bientot";

export const metadata: Metadata = { title: "Location" };

export default function PageLocation() {
  return (
    <Bientot
      titre="Location"
      icone={KeyRound}
      phase={4}
      description="Vue « Aujourd'hui », planning, contrats, assistants de départ et de retour."
    />
  );
}
