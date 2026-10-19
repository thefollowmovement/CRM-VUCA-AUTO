import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { FormulaireConnexion } from "./formulaire-connexion";

export const metadata: Metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="text-2xl" />
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Connexion</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Accédez à votre espace de gestion.</p>
          <FormulaireConnexion />
        </div>
      </div>
    </main>
  );
}
