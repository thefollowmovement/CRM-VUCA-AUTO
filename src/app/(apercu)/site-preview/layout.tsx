import type { Metadata } from "next";
import { inter } from "@/components/site/police";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { variablesAccent } from "@/lib/site/couleurs";
import { cn } from "@/lib/utils";
import { reglagesPublics } from "@/server/site/public";
import "../../(site)/site.css";

export const metadata: Metadata = { title: "Aperçu du style du site", robots: { index: false, follow: false } };

/**
 * Aperçu du site dans le CRM (connexion exigée) : habillage du site public,
 * sans le menu du CRM, avec la couleur d'accent réglée dans « Site web ».
 */
export default async function LayoutApercu({ children }: { children: React.ReactNode }) {
  await exigerRolePage(ROLES_GESTION);
  const r = await reglagesPublics();
  return (
    <div className={cn("site", inter.variable)} style={variablesAccent(r.accent) as React.CSSProperties}>
      {children}
    </div>
  );
}
