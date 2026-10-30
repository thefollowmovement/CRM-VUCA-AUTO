import { Fournisseurs } from "@/components/layout/fournisseurs";
import { redirect } from "next/navigation";
import { BarreLaterale } from "@/components/layout/barre-laterale";
import { BarreMobile } from "@/components/layout/barre-mobile";
import { BoutonAjout } from "@/components/layout/bouton-ajout";
import { EnTete } from "@/components/layout/en-tete";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

/** Zone de gestion : réservée aux administrateurs et gestionnaires. */
export default async function LayoutApplication({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  if (utilisateur.doitChangerMotDePasse) redirect("/compte");

  return (
    <Fournisseurs>
      <div className="min-h-dvh md:flex">
        <BarreLaterale role={utilisateur.role} />
        <div className="min-w-0 flex-1">
          <EnTete utilisateur={utilisateur} />
          <main className="pb-barre-mobile mx-auto max-w-7xl p-4 md:p-6">
            {children}
          </main>
        </div>
        <BarreMobile role={utilisateur.role} />
        <BoutonAjout />
      </div>
    </Fournisseurs>
  );
}
