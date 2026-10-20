import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { NavSiteWeb } from "@/components/site-web/nav-site-web";
import { Button } from "@/components/ui/button";
import { urlSite } from "@/lib/domaines";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lireReglagesSite } from "@/server/site/reglages";

/** Onglet « Site web » : réglages du site public (ADMIN et GESTIONNAIRE). */
export default async function LayoutSiteWeb({ children }: { children: React.ReactNode }) {
  await exigerRolePage(ROLES_GESTION);
  const r = await lireReglagesSite();
  return (
    <>
      <EnTetePage
        titre="Site web"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Réglages du site public.
            {r.enLigne ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">En ligne</span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">En maintenance</span>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/site-preview">Composants</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={urlSite()} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Voir le site
              </a>
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <NavSiteWeb />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
