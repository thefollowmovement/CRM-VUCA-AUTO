import type { Metadata } from "next";
import { PageAssistantEtatDesLieux } from "@/components/etat-des-lieux/page-assistant";

export const metadata: Metadata = { title: "Départ — état des lieux" };

export default async function PageDepart({ params }: { params: Promise<{ id: string }> }) {
  return <PageAssistantEtatDesLieux contratId={(await params).id} type="DEPART" />;
}
