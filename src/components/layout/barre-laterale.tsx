"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { estActif, NAVIGATION } from "./navigation";

/** Navigation principale sur ordinateur / tablette. */
export function BarreLaterale({ role }: { role: Role }) {
  const chemin = usePathname();
  const entrees = NAVIGATION.filter((e) => !e.adminSeulement || role === "ADMIN");

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard">
          <Logo className="text-white" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {entrees.map(({ href, libelle, icone: Icone }) => {
          const actif = estActif(chemin, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                actif
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <Icone className={cn("size-4", actif && "text-primary")} />
              {libelle}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-xs text-sidebar-muted">VUCA AUTO CRM</p>
    </aside>
  );
}
