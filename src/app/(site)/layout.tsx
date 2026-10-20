import type { Metadata, Viewport } from "next";
import { lireConfigDomaines, urlSite } from "@/lib/domaines";
import "./site.css";

const domaine = lireConfigDomaines(process.env).site;

/** Site vitrine public (vuca-auto.fr) : indexable, sans connexion, sans le thème ni l'application du CRM. */
export const metadata: Metadata = {
  metadataBase: domaine ? new URL(urlSite("/", domaine)) : undefined,
  title: { default: "VUCA AUTO — Véhicules d'occasion", template: "%s | VUCA AUTO" },
  description: "VUCA AUTO : véhicules d'occasion contrôlés, contact direct par WhatsApp.",
  robots: { index: true, follow: true },
  applicationName: "VUCA AUTO",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "VUCA AUTO" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return <div className="site">{children}</div>;
}
