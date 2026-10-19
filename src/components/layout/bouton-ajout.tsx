"use client";

import { Car, HandCoins, KeyRound, Plus, Receipt, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MenuDeroulant,
  MenuDeroulantContenu,
  MenuDeroulantDeclencheur,
  MenuDeroulantElement,
  MenuDeroulantLibelle,
} from "@/components/ui/menu-deroulant";

type Raccourci = { libelle: string; href: string; icone: LucideIcon; disponible: boolean; phase: number };

// « disponible » passe à true au fur et à mesure des phases.
const RACCOURCIS: Raccourci[] = [
  { libelle: "Véhicule", href: "/vehicules/nouveau", icone: Car, disponible: true, phase: 2 },
  { libelle: "Dépense", href: "/depenses/nouvelle", icone: Receipt, disponible: true, phase: 3 },
  { libelle: "Location", href: "/location/contrats/nouveau", icone: KeyRound, disponible: true, phase: 4 },
  { libelle: "Paiement", href: "/location/paiements/nouveau", icone: HandCoins, disponible: false, phase: 6 },
];

/** Bouton flottant « + » : ajout rapide depuis n'importe quel écran. */
export function BoutonAjout() {
  const chemin = usePathname();
  // Masqué sur les formulaires (il gênerait la barre « Enregistrer »).
  if (/\/(nouveau|nouvelle|modifier|vendre|depart|retour)$|^\/depenses\/[^/]+$/.test(chemin)) return null;
  return (
    <MenuDeroulant>
      <MenuDeroulantDeclencheur asChild>
        <button
          type="button"
          aria-label="Ajouter"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:bottom-6 md:right-6"
        >
          <Plus className="size-6" />
        </button>
      </MenuDeroulantDeclencheur>
      <MenuDeroulantContenu align="end" side="top" className="min-w-56">
        <MenuDeroulantLibelle>Ajouter…</MenuDeroulantLibelle>
        {RACCOURCIS.map(({ libelle, href, icone: Icone, disponible, phase }) =>
          disponible ? (
            <MenuDeroulantElement key={href} asChild>
              <Link href={href}>
                <Icone /> {libelle}
              </Link>
            </MenuDeroulantElement>
          ) : (
            <MenuDeroulantElement key={href} disabled>
              <Icone /> {libelle}
              <span className="ml-auto text-xs text-muted-foreground">Phase {phase}</span>
            </MenuDeroulantElement>
          ),
        )}
      </MenuDeroulantContenu>
    </MenuDeroulant>
  );
}
