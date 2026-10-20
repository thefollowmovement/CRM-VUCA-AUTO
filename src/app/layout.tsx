import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VUCA AUTO CRM", template: "%s · VUCA AUTO" },
  description: "Gestion achat-revente et location de véhicules",
  robots: { index: false, follow: false },
  applicationName: "VUCA AUTO CRM",
  // Écran d'accueil iPhone : plein écran, icône et nom courts
  appleWebApp: { capable: true, title: "VUCA AUTO", statusBarStyle: "default" },
  icons: { apple: "/icones/apple-touch-icon.png" },
  formatDetection: { telephone: false },
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
        {/* Le CRM ajoute ses fournisseurs (thème, notifications, application installable) dans ses
            propres groupes ; le site public (app/(site)) a son habillage à lui. */}
        {children}
      </body>
    </html>
  );
}
