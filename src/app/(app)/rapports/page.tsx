import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import { Bientot } from "@/components/layout/bientot";

export const metadata: Metadata = { title: "Rapports" };

export default function PageRapports() {
  return (
    <Bientot
      titre="Rapports"
      icone={ChartColumn}
      phase={7}
      description="Bilans par période, bénéfice par partenaire, exports PDF et Excel."
    />
  );
}
