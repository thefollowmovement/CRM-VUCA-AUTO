import { EnTetePage } from "@/components/layout/en-tete-page";
import { NavReglages } from "@/components/reglages/nav-reglages";
import { exigerRolePage, ROLES_ADMIN } from "@/lib/permissions";

/** Réglages : réservés à l'administrateur. */
export default async function LayoutReglages({ children }: { children: React.ReactNode }) {
  await exigerRolePage(ROLES_ADMIN);
  return (
    <>
      <EnTetePage titre="Réglages" description="Paramètres de l'application, réservés à l'administrateur." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <NavReglages />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
