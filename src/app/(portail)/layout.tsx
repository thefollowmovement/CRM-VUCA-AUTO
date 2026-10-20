import { Fournisseurs } from "@/components/layout/fournisseurs";
import { redirect } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { BoutonTheme } from "@/components/layout/bouton-theme";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { exigerRolePage } from "@/lib/permissions";
import { deconnexion } from "@/server/actions/auth";

/** Portail investisseur (lecture seule). L'admin peut aussi l'ouvrir pour vérifier. */
export default async function LayoutPortail({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await exigerRolePage(["INVESTISSEUR_LECTURE", "ADMIN"]);
  if (u.doitChangerMotDePasse) redirect("/compte");
  return (
    <Fournisseurs>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:px-6">
          <Link href="/portail" aria-label="Accueil du portail">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild aria-label="Mon compte">
              <Link href="/compte">
                <UserRound />
              </Link>
            </Button>
            <BoutonTheme />
            <form action={deconnexion}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut /> <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-8">
          {children}
        </main>
      </div>
    </Fournisseurs>
  );
}
