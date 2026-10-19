"use client";

import { BadgeAlert, CalendarRange, CarFront, FileText, HandCoins, Siren, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { href: "/location", libelle: "Aujourd'hui", icone: Sun },
  { href: "/location/planning", libelle: "Planning", icone: CalendarRange },
  { href: "/location/contrats", libelle: "Contrats", icone: FileText },
  { href: "/location/paiements", libelle: "Paiements", icone: HandCoins },
  { href: "/location/impayes", libelle: "Impayés", icone: Siren },
  { href: "/location/amendes", libelle: "PV", icone: BadgeAlert },
  { href: "/location/sinistres", libelle: "Sinistres", icone: CarFront },
];

export function OngletsLocation() {
  const chemin = usePathname();
  // Masqué dans l'assistant et la fiche d'un contrat
  if (/^\/location\/(contrats|amendes|sinistres|paiements)\/.+/.test(chemin)) return null;
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
