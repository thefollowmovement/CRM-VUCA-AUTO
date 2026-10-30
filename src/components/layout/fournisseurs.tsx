"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { EnregistrementSW } from "./enregistrement-sw";

export function Fournisseurs({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster richColors position="top-center" closeButton />
      <EnregistrementSW />
    </ThemeProvider>
  );
}
