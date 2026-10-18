import Link from "next/link";
import type { UtilisateurCourant } from "@/lib/permissions";
import { BoutonTheme } from "./bouton-theme";
import { Logo } from "./logo";
import { MenuUtilisateur } from "./menu-utilisateur";
import { RechercheGlobale } from "./recherche-globale";

export function EnTete({ utilisateur }: { utilisateur: UtilisateurCourant }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <Link href="/dashboard" className="md:hidden">
        <Logo compact />
      </Link>
      <div className="flex-1">
        <RechercheGlobale />
      </div>
      <BoutonTheme />
      <MenuUtilisateur nom={utilisateur.nom} email={utilisateur.email} role={utilisateur.role} />
    </header>
  );
}
