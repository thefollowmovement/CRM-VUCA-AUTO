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
import { cn } from "@/lib/utils";
import { nomVehicule } from "@/lib/vehicule";
import { bilansVehicules, situationPartenaire } from "@/server/requetes/rentabilite";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

export const metadata: Metadata = { title: "Fiche partenaire" };

export default async function PagePartenaire({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const partenaire = await db.partenaire.findUnique({
    where: { id },
    include: {
      utilisateur: { select: { email: true, actif: true } },
    },
  });
  if (!partenaire) notFound();
  // Tous les véhicules où ce partenaire a mis de l'argent, a une part ou a reçu un versement
  const bilans = await bilansVehicules({
    OR: [
      { participations: { some: { partenaireId: id } } },
      { depenses: { some: { payeParId: id, payeSurRecettes: false } } },
      { partsFixes: { some: { partenaireId: id } } },
      { versements: { some: { partenaireId: id } } },
    ],
  });
  const lignes = bilans.map(({ vehicule, bilan }) => ({ vehicule, bilan, s: situationPartenaire(bilan, id) })).filter((l) => l.s.concerne);
  const actifs = lignes.filter((l) => l.vehicule.statut !== "ARCHIVE");
  const enCours = actifs.filter((l) => !l.bilan.vendu);
  const vendus = actifs.filter((l) => l.bilan.vendu);
  const somme = (ls: typeof lignes, f: (l: (typeof lignes)[number]) => number) => ls.reduce((a, l) => a + f(l), 0);
  const indicateurs = [
    {
      libelle: "Capital engagé",
      valeur: formatEuros(somme(enCours, (l) => l.s.investiCentimes)),
      detail: `${enCours.length} véhicule${enCours.length > 1 ? "s" : ""} en cours`,
    },
    {
      libelle: "Bénéfice prévisionnel",
      valeur: formatEuros(somme(enCours, (l) => l.s.beneficeCentimes ?? 0)),
      detail: "véhicules en cours",
    },
    {
      libelle: "Bénéfices réalisés",
      valeur: formatEuros(somme(vendus, (l) => l.s.beneficeCentimes ?? 0)),
      detail: `${vendus.length} véhicule${vendus.length > 1 ? "s" : ""} vendu${vendus.length > 1 ? "s" : ""}`,
    },
    partenaire.type === "SOCIETE"
      ? { libelle: "Part de VUCA AUTO", valeur: formatEuros(somme(vendus, (l) => l.s.aReverserCentimes)), detail: "capital + bénéfice des véhicules vendus" }
      : { libelle: "Reste dû", valeur: formatEuros(somme(vendus, (l) => l.s.resteDuCentimes ?? 0)), detail: "à reverser − déjà versé" },
  ];

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
          {partenaire.estSysteme && <p className="mt-1 text-sm text-muted-foreground">Partenaire principal, non supprimable.</p>}
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
            {partenaire.notes && <p className="mt-4 whitespace-pre-line rounded-md bg-muted p-3 text-sm">{partenaire.notes}</p>}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {indicateurs.map((i) => (
              <Card key={i.libelle} className="p-4">
                <p className="text-xs text-muted-foreground">{i.libelle}</p>
                <p className="text-lg font-semibold tabular-nums">{i.valeur}</p>
                <p className="text-xs text-muted-foreground">{i.detail}</p>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Véhicules ({lignes.length})</CardTitle>
              <CardDescription>
                Investi = participation à l&apos;achat + dépenses payées. Bénéfice et « à reverser » prévisionnels (*) tant que le véhicule
                n&apos;est pas vendu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lignes.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Car className="size-4" /> Aucun véhicule financé pour l&apos;instant.
                </p>
              ) : (
                <ul className="divide-y">
                  {lignes.map(({ vehicule, bilan, s: sit }) => (
                    <li key={vehicule.id}>
                      <Link
                        href={`/vehicules/${vehicule.id}/financement`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{nomVehicule(vehicule)}</p>
                          <p className="text-xs text-muted-foreground">
                            {vehicule.immatriculation ?? "Sans immatriculation"} · investi {formatEuros(sit.investiCentimes)}
                            {sit.depensesCentimes > 0 && ` (dont dépenses ${formatEuros(sit.depensesCentimes)})`}
                          </p>
                        </div>
                        <BadgeStatut statut={vehicule.statut} className="hidden sm:inline-flex" />
                        <dl className="grid grid-cols-3 gap-3 text-right text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Bénéfice{!bilan.vendu && " *"}</dt>
                            <dd className={cn("font-medium tabular-nums", (sit.beneficeCentimes ?? 0) < 0 && "text-destructive")}>
                              {formatEuros(sit.beneficeCentimes)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">À reverser{!bilan.vendu && " *"}</dt>
                            <dd className="font-medium tabular-nums">{formatEuros(sit.aReverserCentimes)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Reste dû</dt>
                            <dd className="font-semibold tabular-nums">{formatEuros(sit.resteDuCentimes)}</dd>
                          </div>
                        </dl>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <EtatVide
            icone={HandCoins}
            titre="Versements et relevés"
            description="La saisie des versements (capital remboursé, bénéfice versé) et le relevé PDF arrivent en Phase 7."
          />
        </div>
      </div>
    </>
  );
}
