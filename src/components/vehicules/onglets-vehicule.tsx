"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function OngletsVehicule({ id, location }: { id: string; location: boolean }) {
  const chemin = usePathname();
  const base = `/vehicules/${id}`;
  const onglets = [
    { href: base, libelle: "Résumé" },
    { href: `${base}/annonce`, libelle: "Annonce" },
    { href: `${base}/financement`, libelle: "Financement" },
    { href: `${base}/depenses`, libelle: "Dépenses" },
    ...(location ? [{ href: `${base}/location`, libelle: "Location" }] : []),
    { href: `${base}/dommages`, libelle: "Dommages" },
    { href: `${base}/entretien`, libelle: "Entretien" },
    { href: `${base}/documents`, libelle: "Documents" },
    { href: `${base}/historique`, libelle: "Historique" },
  ];
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
      {onglets.map((o) => {
        const actif = chemin === o.href;
        return (
          <Link
            key={o.href}
            href={o.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              actif ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {o.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
