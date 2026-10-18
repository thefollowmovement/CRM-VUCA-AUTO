import { ArrowLeft, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigerConnexionPage } from "@/lib/permissions";
import { FormulaireMotDePasse } from "./formulaire-mot-de-passe";

export const metadata: Metadata = { title: "Mon compte" };

const LIBELLES_ROLES = {
  ADMIN: "Administrateur",
  GESTIONNAIRE: "Gestionnaire",
  INVESTISSEUR_LECTURE: "Investisseur (lecture seule)",
};

export default async function PageCompte() {
  const u = await exigerConnexionPage();
  const accueil = u.role === "INVESTISSEUR_LECTURE" ? "/portail" : "/dashboard";

  return (
    <div className="flex flex-col gap-6">
      {!u.doitChangerMotDePasse && (
        <Link href={accueil} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Link>
      )}
      <h1 className="text-2xl font-bold">Mon compte</h1>

      {u.doitChangerMotDePasse && (
        <div className="flex gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <TriangleAlert className="size-5 shrink-0 text-amber-600" />
          <p>
            <strong>Choisissez votre mot de passe personnel</strong> avant de continuer. Le mot de passe
            temporaire qui vous a été communiqué ne sera plus valable.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{u.nom}</CardTitle>
          <CardDescription>
            {u.email} · {LIBELLES_ROLES[u.role]}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer de mot de passe</CardTitle>
          <CardDescription>10 caractères minimum, avec des lettres et des chiffres.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaireMotDePasse redirection={u.doitChangerMotDePasse ? accueil : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
