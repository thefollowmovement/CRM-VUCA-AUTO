import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { BoutonTheme } from "@/components/layout/bouton-theme";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { exigerRolePage } from "@/lib/permissions";
import { deconnexion } from "@/server/actions/auth";

/** Portail investisseur (lecture seule). L'admin peut aussi l'ouvrir pour vérifier. */
export default async function LayoutPortail({ children }: { children: React.ReactNode }) {
  const u = await exigerRolePage(["INVESTISSEUR_LECTURE", "ADMIN"]);
  if (u.doitChangerMotDePasse) redirect("/compte");
  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <BoutonTheme />
          <form action={deconnexion}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut /> Déconnexion
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
    </div>
  );
}
