import { LogOut } from "lucide-react";
import Link from "next/link";
import { BoutonTheme } from "@/components/layout/bouton-theme";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { exigerConnexionPage } from "@/lib/permissions";
import { deconnexion } from "@/server/actions/auth";

/** Mise en page simple, accessible à tous les rôles (y compris au 1er mot de passe). */
export default async function LayoutCompte({ children }: { children: React.ReactNode }) {
  const u = await exigerConnexionPage();
  const accueil = u.role === "INVESTISSEUR_LECTURE" ? "/portail" : "/dashboard";
  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <Link href={accueil}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <BoutonTheme />
          <form action={deconnexion}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut /> Déconnexion
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-xl p-4 md:p-8">{children}</main>
    </div>
  );
}
