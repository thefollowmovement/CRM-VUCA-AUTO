import type { Metadata } from "next";
import { PageAssistantEtatDesLieux } from "@/components/etat-des-lieux/page-assistant";

export const metadata: Metadata = { title: "Retour — état des lieux" };

export default async function PageRetour({ params }: { params: Promise<{ id: string }> }) {
  return <PageAssistantEtatDesLieux contratId={(await params).id} type="RETOUR" />;
}
