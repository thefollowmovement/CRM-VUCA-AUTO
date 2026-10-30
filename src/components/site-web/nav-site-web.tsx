"use client";

import { ChartLine, FileText, Globe, MessageCircle, Search, ShieldCheck, Star, Type } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/site-web", libelle: "Général", icone: Globe },
  { href: "/site-web/contact", libelle: "Contact & WhatsApp", icone: MessageCircle },
  { href: "/site-web/confiance", libelle: "Confiance", icone: ShieldCheck },
  { href: "/site-web/avis", libelle: "Avis clients", icone: Star },
  { href: "/site-web/contenu", libelle: "Contenu", icone: Type },
  { href: "/site-web/referencement", libelle: "Référencement", icone: Search },
  { href: "/site-web/legal", libelle: "Légal", icone: FileText },
  { href: "/site-web/statistiques", libelle: "Statistiques", icone: ChartLine },
];

export function NavSiteWeb() {
  const chemin = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0">
      {SECTIONS.map(({ href, libelle, icone: Icone }) => {
        const actif = chemin === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
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
