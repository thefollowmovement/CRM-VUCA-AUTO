import type { Metadata, Viewport } from "next";
import { Fournisseurs } from "@/components/layout/fournisseurs";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VUCA AUTO CRM", template: "%s · VUCA AUTO" },
  description: "Gestion achat-revente et location de véhicules",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Fournisseurs>{children}</Fournisseurs>
      </body>
    </html>
  );
}
