"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MenuDeroulant,
  MenuDeroulantContenu,
  MenuDeroulantDeclencheur,
  MenuDeroulantElement,
  MenuDeroulantLibelle,
  MenuDeroulantSeparateur,
} from "@/components/ui/menu-deroulant";
import { deconnexion } from "@/server/actions/auth";

const LIBELLES_ROLES = {
  ADMIN: "Administrateur",
  GESTIONNAIRE: "Gestionnaire",
  INVESTISSEUR_LECTURE: "Investisseur",
} as const;

export function MenuUtilisateur({
  nom,
  email,
  role,
}: {
  nom: string;
  email: string;
  role: keyof typeof LIBELLES_ROLES;
}) {
  const initiales = nom
    .split(/\s+/)
    .map((m) => m[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <MenuDeroulant>
      <MenuDeroulantDeclencheur asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mon compte">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initiales}
          </span>
        </Button>
      </MenuDeroulantDeclencheur>
      <MenuDeroulantContenu align="end">
        <MenuDeroulantLibelle>
          <span className="block font-semibold text-foreground">{nom}</span>
          <span className="block font-normal">{email}</span>
          <span className="block font-normal">{LIBELLES_ROLES[role]}</span>
        </MenuDeroulantLibelle>
        <MenuDeroulantSeparateur />
        <MenuDeroulantElement asChild>
          <Link href="/compte">
            <UserRound /> Mon compte
          </Link>
        </MenuDeroulantElement>
        <MenuDeroulantElement
          className="text-destructive"
          onSelect={() => {
            void deconnexion();
          }}
        >
          <LogOut /> Déconnexion
        </MenuDeroulantElement>
      </MenuDeroulantContenu>
    </MenuDeroulant>
  );
}
