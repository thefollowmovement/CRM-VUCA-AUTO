import { ArrowLeft, Car, HandCoins, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsPartenaire } from "@/components/partenaires/actions-partenaire";
import { DialoguePartenaire } from "@/components/partenaires/dialogue-partenaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { db } from "@/lib/db";
import { BadgeStatut } from "@/components/vehicules/badge-statut";
import { formatDate, formatEuros, masquerIban } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

export const metadata: Metadata = { title: "Fiche partenaire" };

export default async function PagePartenaire({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const partenaire = await db.partenaire.findUnique({
    where: { id },
    include: {
      utilisateur: { select: { email: true, actif: true } },
      participations: {
        orderBy: { vehicule: { dateAchat: "desc" } },
        include: {
          vehicule: {
            select: {
              id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true,
              participations: { select: { montantCentimes: true } },
            },
          },
        },
      },
    },
  });
  if (!partenaire) notFound();
  const enCours = partenaire.participations.filter((p) => !["VENDU", "ARCHIVE"].includes(p.vehicule.statut));
  const capitalEngage = enCours.reduce((a, p) => a + p.montantCentimes, 0);

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
          <Card>
            <CardHeader>
              <CardTitle>Véhicules financés ({partenaire.participations.length})</CardTitle>
              <CardDescription>
                Capital à l&apos;achat engagé sur les véhicules en cours : {formatEuros(capitalEngage)} · Dépenses payées,
                bénéfices et reste dû arrivent en Phase 3.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {partenaire.participations.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Car className="size-4" /> Aucun véhicule financé pour l&apos;instant.
                </p>
              ) : (
                <ul className="divide-y">
                  {partenaire.participations.map((p) => {
                    const total = p.vehicule.participations.reduce((a, x) => a + x.montantCentimes, 0);
                    const part = total > 0 ? Math.round((p.montantCentimes / total) * 1000) / 10 : 0;
                    return (
                      <li key={p.id}>
                        <Link href={`/vehicules/${p.vehicule.id}/financement`} className="flex items-center gap-3 py-3 hover:bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{nomVehicule(p.vehicule)}</p>
                            <p className="text-xs text-muted-foreground">{p.vehicule.immatriculation ?? "Sans immatriculation"}</p>
                          </div>
                          <BadgeStatut statut={p.vehicule.statut} className="hidden sm:inline-flex" />
                          <div className="text-right">
                            <p className="font-semibold tabular-nums">{formatEuros(p.montantCentimes)}</p>
                            <p className="text-xs text-muted-foreground">{String(part).replace(".", ",")} % de l&apos;achat</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
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
