import { CircleCheck, CircleDashed, HandCoins, Settings, Tags, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

export const metadata: Metadata = { title: "Dashboard" };

const PHASES = [
  { numero: 1, titre: "Socle : connexion, rôles, navigation, réglages, partenaires", faite: true },
  { numero: 2, titre: "Véhicules, photos, documents, financement", faite: false },
  { numero: 3, titre: "Dépenses et moteur de calcul de rentabilité", faite: false },
  { numero: 4, titre: "Location : clients, contrats, planning", faite: false },
  { numero: 5, titre: "État des lieux mobile", faite: false },
  { numero: 6, titre: "Paiements, échéancier, PV, sinistres, PDF", faite: false },
  { numero: 7, titre: "Dashboard complet, alertes, rapports", faite: false },
  { numero: 8, titre: "Portail investisseur, PWA, sauvegardes", faite: false },
];

export default async function PageDashboard() {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  const [nbInvestisseurs, nbUtilisateurs, nbCategories] = await Promise.all([
    db.partenaire.count({ where: { type: "INVESTISSEUR", actif: true } }),
    db.utilisateur.count({ where: { actif: true } }),
    db.categorieDepense.count({ where: { actif: true } }),
  ]);

  const cartes = [
    { titre: "Investisseurs actifs", valeur: nbInvestisseurs, icone: HandCoins, href: "/investisseurs" },
    { titre: "Utilisateurs", valeur: nbUtilisateurs, icone: Users, href: "/reglages/utilisateurs", admin: true },
    { titre: "Catégories de dépenses", valeur: nbCategories, icone: Tags, href: "/reglages/categories", admin: true },
  ].filter((c) => !c.admin || utilisateur.role === "ADMIN");

  return (
    <>
      <EnTetePage
        titre={`Bonjour ${utilisateur.nom.split(" ")[0]} 👋`}
        description="Les indicateurs (bénéfices, stock, location, alertes) arriveront en Phase 7."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartes.map(({ titre, valeur, icone: Icone, href }) => (
          <Link key={titre} href={href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex-row items-center justify-between">
                <CardDescription>{titre}</CardDescription>
                <Icone className="size-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{valeur}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Avancement du projet</CardTitle>
          <CardDescription>Les modules s&apos;activent au fil des phases.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2">
            {PHASES.map((p) => (
              <li key={p.numero} className="flex items-center gap-3 text-sm">
                {p.faite ? (
                  <CircleCheck className="size-5 shrink-0 text-success" />
                ) : (
                  <CircleDashed className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className={p.faite ? "font-medium" : "text-muted-foreground"}>
                  Phase {p.numero} — {p.titre}
                </span>
              </li>
            ))}
          </ol>
          {utilisateur.role === "ADMIN" && (
            <Link href="/reglages" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Settings className="size-4" /> Compléter les informations de la société
            </Link>
          )}
        </CardContent>
      </Card>
    </>
  );
}
