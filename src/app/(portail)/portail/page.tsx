import { HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EtatVide } from "@/components/ui/etat-vide";
import { db } from "@/lib/db";
import { exigerRolePage } from "@/lib/permissions";

export const metadata: Metadata = { title: "Mon espace investisseur" };

export default async function PagePortail() {
  const u = await exigerRolePage(["INVESTISSEUR_LECTURE", "ADMIN"]);
  const partenaire = u.partenaireId
    ? await db.partenaire.findUnique({ where: { id: u.partenaireId }, select: { nom: true } })
    : null;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Bonjour {partenaire?.nom ?? u.nom}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Votre espace investisseur, en lecture seule.</p>
      <EtatVide
        icone={HandCoins}
        titre="Votre tableau de bord arrive en Phase 8"
        description="Vous y retrouverez les véhicules que vous financez, vos bénéfices, ce qui vous a été versé et ce qui reste dû."
        action={
          <Link href="/compte" className="text-sm font-medium text-primary">
            Gérer mon mot de passe
          </Link>
        }
      />
    </>
  );
}
