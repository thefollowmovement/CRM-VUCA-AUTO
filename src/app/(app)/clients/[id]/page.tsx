import { ArrowLeft, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsClient } from "@/components/clients/actions-client";
import { EncadreAlertes } from "@/components/clients/alertes-client";
import { DocumentsClient } from "@/components/clients/documents-client";
import { BadgeContrat } from "@/components/location/badge-contrat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeInfos } from "@/components/ui/liste-infos";
import { alertesClient, anneesPleines } from "@/lib/calculs/clients";
import { imputerPaiements, joursRetardEcheance } from "@/lib/calculs/echeancier";
import { statutAffiche } from "@/lib/contrat";
import { db } from "@/lib/db";
import { aujourdhuiISO, dateCalendaireVersISO, formatDate, formatDateHeure, formatEuros } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_CIVILITE, LIBELLES_PIECE, LIBELLES_TYPE_LOCATION } from "@/lib/validations/location";
import { LIBELLES_STATUT_AMENDE } from "@/lib/validations/paiement";
import { totalEncaisse } from "@/server/echeances";
import { nomClient, obtenirClient } from "@/server/requetes/clients";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await db.client.findUnique({ where: { id: (await params).id }, select: { nom: true, prenom: true } });
  return { title: c ? nomClient(c) : "Client" };
}

export default async function PageClient({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const [c, reglages] = await Promise.all([obtenirClient(id), lireReglages()]);
  if (!c) notFound();
  const auj = new Date();
  const alertes = c.anonymiseLe ? [] : alertesClient(c, auj, reglages.anciennetePermisMinAnnees);
  const nom = nomClient(c);
  const modifiable = !c.anonymiseLe;

  // Totaux : locations + frais (hors annulées), encaissements, reste à payer, échéances en retard
  const contratsFactures = c.contrats.filter((x) => x.statut !== "ANNULEE");
  const totalLocations = contratsFactures.reduce((a, x) => a + x.prixTotalCentimes + x.fraisSupplementaires.reduce((b, f) => b + f.montantCentimes, 0), 0);
  const totalPaye = totalEncaisse(c.contrats.flatMap((x) => x.paiements));
  const resteAPayer = totalLocations - totalPaye;
  const aujISO = aujourdhuiISO();
  let enRetard = 0;
  for (const x of contratsFactures) {
    if (x.statut === "RESERVATION") continue;
    const imp = imputerPaiements(x.echeances, x.paiements.filter((p) => p.nature === "LOCATION"));
    for (const e of x.echeances) {
      const i = imp.echeances.find((y) => y.id === e.id)!;
      if (joursRetardEcheance(dateCalendaireVersISO(e.dateEcheance), i.statut, aujISO) > 0) enRetard += e.montantCentimes - i.payeCentimes;
    }
  }

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clients
      </Link>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {c.civilite && <span className="font-normal text-muted-foreground">{LIBELLES_CIVILITE[c.civilite]}</span>}
            {nom}
            {c.listeNoire && <Badge variant="destructive">Liste noire</Badge>}
            {c.archiveLe && !c.anonymiseLe && <Badge variant="warning">Archivé</Badge>}
            {c.anonymiseLe && <Badge variant="secondary">Anonymisé le {formatDate(c.anonymiseLe)}</Badge>}
          </h1>
          {c.entreprise && <p className="text-sm text-muted-foreground">{c.entreprise}</p>}
        </div>
        <ActionsClient id={c.id} nom={nom} archive={!!c.archiveLe} anonymise={!!c.anonymiseLe} listeNoire={c.listeNoire} estAdmin={u.role === "ADMIN"} />
      </div>
      <EncadreAlertes alertes={alertes} className="mb-4" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <ListeInfos
                elements={[
                  { libelle: "Téléphone", valeur: c.telephone && <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="text-primary">{c.telephone}</a> },
                  { libelle: "Email", valeur: c.email && <a href={`mailto:${c.email}`} className="text-primary">{c.email}</a> },
                  { libelle: "Adresse", valeur: [c.adresse, [c.codePostal, c.ville].filter(Boolean).join(" "), c.pays !== "France" ? c.pays : null].filter(Boolean).join(", ") || null },
                  { libelle: "Naissance", valeur: c.dateNaissance && `${formatDate(c.dateNaissance)}${c.lieuNaissance ? ` à ${c.lieuNaissance}` : ""} (${anneesPleines(c.dateNaissance, auj)} ans)` },
                  { libelle: "SIRET", valeur: c.siretEntreprise },
                ]}
              />
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-semibold">Permis et identité</p>
                <ListeInfos
                  elements={[
                    { libelle: "N° de permis", valeur: c.numeroPermis },
                    { libelle: "Catégorie", valeur: c.categoriePermis },
                    { libelle: "Obtenu le", valeur: c.dateObtentionPermis && `${formatDate(c.dateObtentionPermis)} (${anneesPleines(c.dateObtentionPermis, auj)} ans)` },
                    { libelle: "Valide jusqu'au", valeur: c.dateValiditePermis && formatDate(c.dateValiditePermis) },
                    { libelle: "Pièce d'identité", valeur: c.typePieceIdentite && `${LIBELLES_PIECE[c.typePieceIdentite]}${c.numeroPieceIdentite ? ` n° ${c.numeroPieceIdentite}` : ""}` },
                    { libelle: "Pièce valide jusqu'au", valeur: c.dateValiditePieceIdentite && formatDate(c.dateValiditePieceIdentite) },
                  ]}
                />
              </div>
              {c.notes && <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{c.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Locations ({c.contrats.length})</CardTitle>
              <CardDescription>
                Total facturé : {formatEuros(totalLocations)} · encaissé : {formatEuros(totalPaye)}
                {resteAPayer > 0 && <> · reste à payer : <strong className="text-foreground">{formatEuros(resteAPayer)}</strong></>}
                {resteAPayer < 0 && <> · trop-perçu : {formatEuros(-resteAPayer)}</>}
              </CardDescription>
              {enRetard > 0 && <p className="text-sm font-medium text-destructive">Impayés en retard : {formatEuros(enRetard)}</p>}
            </CardHeader>
            <CardContent>
              {c.contrats.length === 0 && c.conduitesAdditionnelles.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KeyRound className="size-4" /> Aucune location pour l&apos;instant.
                </p>
              ) : (
                <ul className="divide-y">
                  {c.contrats.map((x) => (
                    <li key={x.id}>
                      <Link href={`/location/contrats/${x.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {x.numero} · {nomVehicule(x.vehicule)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {LIBELLES_TYPE_LOCATION[x.type]} · du {formatDateHeure(x.departPrevuLe)} au {formatDateHeure(x.retourPrevuLe)}
                          </p>
                        </div>
                        <BadgeContrat statut={statutAffiche(x.statut, x.retourPrevuLe, auj)} />
                        <span className="w-24 text-right font-semibold tabular-nums">{formatEuros(x.prixTotalCentimes)}</span>
                      </Link>
                    </li>
                  ))}
                  {c.conduitesAdditionnelles.map(({ contrat: x }) => (
                    <li key={`cond-${x.id}`}>
                      <Link href={`/location/contrats/${x.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {x.numero} · {nomVehicule(x.vehicule)}
                          </p>
                          <p className="text-xs text-muted-foreground">Conducteur additionnel · du {formatDate(x.departPrevuLe)} au {formatDate(x.retourPrevuLe)}</p>
                        </div>
                        <BadgeContrat statut={statutAffiche(x.statut, x.retourPrevuLe, auj)} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          {c.amendes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>PV ({c.amendes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {c.amendes.map((a) => (
                    <li key={a.id}>
                      <Link href={`/location/amendes/${a.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-muted/50">
                        <span className="min-w-0 flex-1">
                          {formatDateHeure(a.infractionLe)}
                          {a.contrat && <span className="text-muted-foreground"> · {a.contrat.numero}</span>}
                          <span className="block text-xs text-muted-foreground">{LIBELLES_STATUT_AMENDE[a.statut]}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatEuros(a.montantCentimes)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {!c.anonymiseLe && <DocumentsClient clientId={c.id} documents={c.fichiers} modifiable={modifiable} />}
        </div>
      </div>
    </>
  );
}
