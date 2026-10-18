import type { Metadata } from "next";
import { ListeUtilisateurs } from "@/components/reglages/liste-utilisateurs";
import { db } from "@/lib/db";
import { exigerRolePage, ROLES_ADMIN } from "@/lib/permissions";

export const metadata: Metadata = { title: "Réglages — Utilisateurs" };

export default async function PageReglagesUtilisateurs() {
  const moi = await exigerRolePage(ROLES_ADMIN);
  const [utilisateurs, investisseurs] = await Promise.all([
    db.utilisateur.findMany({
      orderBy: [{ actif: "desc" }, { nom: "asc" }],
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        actif: true,
        partenaireId: true,
        derniereConnexionLe: true,
        partenaire: { select: { nom: true } },
      },
    }),
    db.partenaire.findMany({
      where: { type: "INVESTISSEUR", actif: true },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Utilisateurs</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Qui peut se connecter à l&apos;application, et avec quels droits.
      </p>
      <ListeUtilisateurs
        moiId={moi.id}
        investisseurs={investisseurs}
        utilisateurs={utilisateurs.map(({ partenaire, ...u }) => ({ ...u, partenaireNom: partenaire?.nom ?? null }))}
      />
    </>
  );
}
