import { ArrowLeft, Car, HandCoins, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsPartenaire } from "@/components/partenaires/actions-partenaire";
import { DialoguePartenaire } from "@/components/partenaires/dialogue-partenaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { db } from "@/lib/db";
import { formatDate, masquerIban } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

export const metadata: Metadata = { title: "Fiche partenaire" };

export default async function PagePartenaire({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const partenaire = await db.partenaire.findUnique({
    where: { id },
    include: { utilisateur: { select: { email: true, actif: true } } },
  });
  if (!partenaire) notFound();

  const infos = [
    { libelle: "Téléphone", valeur: partenaire.telephone },
    { libelle: "Email", valeur: partenaire.email },
    { libelle: "IBAN", valeur: partenaire.iban ? masquerIban(partenaire.iban) : null },
    { libelle: "Accès au portail", valeur: partenaire.utilisateur ? partenaire.utilisateur.email : "Aucun compte" },
    { libelle: "Ajouté le", valeur: formatDate(partenaire.creeLe) },
  ];

  return (
    <>
      <Link href="/investisseurs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Investisseurs
      </Link>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {partenaire.nom}
            <Badge variant={partenaire.type === "SOCIETE" ? "default" : "secondary"}>
              {partenaire.type === "SOCIETE" ? "Société" : "Investisseur"}
            </Badge>
            {!partenaire.actif && <Badge variant="warning">Archivé</Badge>}
          </h1>
          {partenaire.estSysteme && (
            <p className="mt-1 text-sm text-muted-foreground">Partenaire principal, non supprimable.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <DialoguePartenaire
            partenaire={partenaire}
            declencheur={
              <Button variant="outline">
                <Pencil /> Modifier
              </Button>
            }
          />
          <ActionsPartenaire
            id={partenaire.id}
            nom={partenaire.nom}
            actif={partenaire.actif}
            estSysteme={partenaire.estSysteme}
            peutSupprimer={utilisateur.role === "ADMIN"}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              {infos.map((i) => (
                <div key={i.libelle}>
                  <dt className="text-muted-foreground">{i.libelle}</dt>
                  <dd className="font-medium">{i.valeur || "—"}</dd>
                </div>
              ))}
            </dl>
            {partenaire.notes && (
              <p className="mt-4 whitespace-pre-line rounded-md bg-muted p-3 text-sm">{partenaire.notes}</p>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <EtatVide
            icone={Car}
            titre="Véhicules financés"
            description="Les véhicules financés, l'investissement, la part et le bénéfice de chacun apparaîtront ici (Phases 2 et 3)."
          />
          <EtatVide
            icone={HandCoins}
            titre="Versements et relevés"
            description="Ce qui a déjà été versé, le reste dû et le relevé PDF arrivent en Phase 7."
          />
        </div>
      </div>
    </>
  );
}
