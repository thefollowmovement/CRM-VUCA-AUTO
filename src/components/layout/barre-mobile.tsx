"use client";

import { Ellipsis, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Role } from "@/generated/prisma/enums";
import { deconnexion } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { estActif, NAVIGATION } from "./navigation";

/** Barre de navigation en bas de l'écran sur téléphone. */
export function BarreMobile({ role }: { role: Role }) {
  const chemin = usePathname();
  const [plusOuvert, setPlusOuvert] = useState(false);
  const entrees = NAVIGATION.filter((e) => !e.adminSeulement || role === "ADMIN");
  const principales = entrees.filter((e) => e.barreMobile);
  const autres = entrees.filter((e) => !e.barreMobile);
  const autreActive = autres.some((e) => estActif(chemin, e.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {principales.map(({ href, libelle, icone: Icone }) => {
            const actif = estActif(chemin, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  actif ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icone className="size-5" />
                {libelle}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setPlusOuvert(true)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              autreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Ellipsis className="size-5" />
            Plus
          </button>
        </div>
      </nav>

      <Dialog open={plusOuvert} onOpenChange={setPlusOuvert}>
        <DialogContent>
          <DialogTitle>Menu</DialogTitle>
          <div className="grid grid-cols-3 gap-2">
            {[...autres, { href: "/compte", libelle: "Mon compte", icone: UserRound }].map(
              ({ href, libelle, icone: Icone }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setPlusOuvert(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium",
                    estActif(chemin, href) && "border-primary text-primary",
                  )}
                >
                  <Icone className="size-6" />
                  {libelle}
                </Link>
              ),
            )}
            <form action={deconnexion} className="contents">
              <button
                type="submit"
                className="flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium text-destructive"
              >
                <LogOut className="size-6" />
                Déconnexion
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
