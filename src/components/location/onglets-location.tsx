"use client";

import { CalendarRange, FileText, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { href: "/location", libelle: "Aujourd'hui", icone: Sun },
  { href: "/location/planning", libelle: "Planning", icone: CalendarRange },
  { href: "/location/contrats", libelle: "Contrats", icone: FileText },
];

export function OngletsLocation() {
  const chemin = usePathname();
  // Masqué dans l'assistant et la fiche d'un contrat
  if (/^\/location\/contrats\/.+/.test(chemin)) return null;
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
      {ONGLETS.map(({ href, libelle, icone: Icone }) => {
        const actif = chemin === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              actif ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icone className="size-4" /> {libelle}
          </Link>
        );
      })}
    </nav>
  );
}
