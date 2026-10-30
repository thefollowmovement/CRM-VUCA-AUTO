"use client";

import { BadgeAlert, Bell, Building, FileText, FlaskConical, History, ListChecks, Package, Puzzle, Tags, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/reglages", libelle: "Société", icone: Building },
  { href: "/reglages/documents", libelle: "Documents", icone: FileText },
  { href: "/reglages/alertes", libelle: "Numérotation & alertes", icone: Bell },
  { href: "/reglages/categories", libelle: "Catégories de dépenses", icone: Tags },
  { href: "/reglages/options", libelle: "Options de location", icone: Package },
  { href: "/reglages/checklist", libelle: "Check-list état des lieux", icone: ListChecks },
  { href: "/reglages/amendes", libelle: "Amendes", icone: BadgeAlert },
  { href: "/reglages/extension-antai", libelle: "Extension ANTAI", icone: Puzzle },
  { href: "/reglages/utilisateurs", libelle: "Utilisateurs", icone: UserCog },
  { href: "/reglages/journal", libelle: "Journal d'activité", icone: History },
  { href: "/reglages/demonstration", libelle: "Démonstration", icone: FlaskConical },
];

export function NavReglages() {
  const chemin = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0">
      {SECTIONS.map(({ href, libelle, icone: Icone }) => {
        const actif = chemin === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              actif ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icone className="size-4" />
            {libelle}
          </Link>
        );
      })}
    </nav>
  );
}
