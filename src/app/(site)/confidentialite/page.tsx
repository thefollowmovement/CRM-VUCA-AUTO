import type { Metadata } from "next";
import { PageLegale } from "@/components/site/page-legale";
import { PageMaintenance } from "@/components/site/page-maintenance";
import { etatSite } from "@/server/site/etat";
import { textesLegaux } from "@/server/site/public";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default async function PageConfidentialite() {
  const { r, maintenance, logo, whatsapp } = await etatSite();
  if (maintenance) return <PageMaintenance r={r} logo={logo} lienWhatsApp={whatsapp} />;
  const t = await textesLegaux();
  return <PageLegale titre="Politique de confidentialité" texte={t.confidentialite} />;
}
