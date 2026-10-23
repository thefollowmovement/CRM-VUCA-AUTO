"use client";

import { ClipboardCheck, List, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Sous-navigation des PV : liste, import des avis, validation. */
export function OngletsAmendes({ aValider, aLire }: { aValider: number; aLire: number }) {
  const chemin = usePathname();
  const onglets = [
    { href: "/location/amendes", libelle: "Liste", icone: List, compteur: 0 },
    { href: "/location/amendes/importer", libelle: "Importer", icone: Upload, compteur: aLire },
    { href: "/location/amendes/a-valider", libelle: "À valider", icone: ClipboardCheck, compteur: aValider },
  ];
  return (
    <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="PV">
      {onglets.map(({ href, libelle, icone: Icone, compteur }) => {
        const actif = chemin === href || (href === "/location/amendes/importer" && chemin.startsWith("/location/amendes/lots/"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5", actif ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Icone className="size-4" /> {libelle}
            {compteur > 0 && <span className="rounded-full bg-warning/25 px-1.5 text-xs font-semibold text-amber-800 tabular-nums dark:text-warning">{compteur}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
