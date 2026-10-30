import { ArrowLeft, ExternalLink, FileText, StickyNote, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsAmende } from "@/components/incidents/actions-amende";
import { FormulaireAmende } from "@/components/incidents/formulaire-amende";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeInfos } from "@/components/ui/liste-infos";
import { champsManquantsPourDesignation, etatEcheance, joursAvantLimite, raisonFicheClient, type Raison } from "@/lib/calculs/amendes";
import { dateVersSaisieParis, jourParisISO } from "@/lib/dates";
import { centimesVersSaisie, dateCalendaireVersISO, formatDate, formatDateHeure, formatEuros, formatNombre } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_TYPE_AVIS } from "@/lib/validations/amendes";
import { LIBELLES_STATUT_AMENDE, STATUTS_AMENDE_MANUELS, VARIANTE_STATUT_AMENDE, type SaisieAmende } from "@/lib/validations/paiement";
import { obtenirAmende, vehiculesPourIncidents } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "PV" };

export default async function PageAmende({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const [a, vehicules] = await Promise.all([obtenirAmende(id), vehiculesPourIncidents()]);
  if (!a) notFound();
  const client = a.client;
  const aujourdhui = jourParisISO(new Date());
  const echeance = etatEcheance(a.dateLimite, a.statut, aujourdhui);
  const joursRestants = a.dateLimite ? joursAvantLimite(a.dateLimite, aujourdhui) : null;
  const raisons = [...((a.raisonsVerification ?? []) as Raison[]).filter((r) => r.code !== "fiche_incomplete"), ...raisonFicheClient(client)];
  const manquants = client ? champsManquantsPourDesignation(client) : [];
  const scan = a.fichiers[0] ?? null;
  const refacture = a.frais.some((f) => f.type === "AMENDE_REFACTUREE");
  const fraisGestion = a.frais.filter((f) => f.type === "FRAIS_GESTION_AMENDE");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/location/amendes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> PV
      </Link>
      <EnTetePage
        titre={a.numeroAvis ? `Avis n° ${a.numeroAvis}` : a.infractionLe ? `PV du ${formatDateHeure(a.infractionLe)}` : "Avis importé"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {a.vehicule ? `${nomVehicule(a.vehicule)}${a.vehicule.immatriculation ? ` · ${a.vehicule.immatriculation}` : ""}` : (a.immatriculationLue ?? "Véhicule à identifier")}
            <Badge variant={VARIANTE_STATUT_AMENDE[a.statut]}>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
            {echeance && a.dateLimite && joursRestants !== null && (
              <Badge variant={echeance === "depassee" ? "destructive" : echeance === "proche" ? "warning" : "secondary"}>
                {echeance === "depassee" ? `Délai dépassé depuis le ${formatDate(a.dateLimite)}` : `À désigner avant le ${formatDate(a.dateLimite)} (J-${joursRestants})`}
              </Badge>
            )}
          </span>
        }
      />
      <ActionsAmende id={a.id} statut={a.statut} refacturable={!!a.contratId && !refacture && a.montantCentimes != null && !["CONDUCTEUR_DESIGNE", "IGNORE", "A_LIRE"].includes(a.statut)} estAdmin={u.role === "ADMIN"} scanId={scan?.id} />

      {raisons.length > 0 && ["A_VALIDER", "RECUE"].includes(a.statut) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {raisons.map((r) => (
            <Badge key={r.code} variant={r.niveau === "blocage" ? "destructive" : "warning"} className="whitespace-normal">
              {r.texte}
            </Badge>
          ))}
          <Link href="/location/amendes/a-valider" className="font-medium text-primary underline">
            Vérifier dans « À valider »
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" /> Avis
          </CardTitle>
          {a.lotImport && <CardDescription>Importé{a.creePar ? ` par ${a.creePar.nom}` : ""} le {formatDateHeure(a.creeLe)}{a.ocrModele ? ` · lu automatiquement (${a.ocrModele})` : ""}</CardDescription>}
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          {scan ? (
            <a href={`/api/fichiers/${scan.id}${scan.typeMime === "application/pdf" ? "?taille=page" : ""}`} target="_blank" rel="noopener noreferrer" className="block w-32 overflow-hidden rounded-lg border bg-muted hover:opacity-90 sm:w-full" aria-label="Voir le scan en grand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/fichiers/${scan.id}?taille=mini`} alt="Scan de l'avis" className="h-44 w-full object-cover object-top" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun scan.</p>
          )}
          <ListeInfos
            elements={[
              { libelle: "Type", valeur: a.typeAvis ? LIBELLES_TYPE_AVIS[a.typeAvis] : null },
              { libelle: "Date de l'avis", valeur: a.dateAvis && formatDate(a.dateAvis) },
              { libelle: "Désignation avant le", valeur: a.dateLimite && formatDate(a.dateLimite) },
              { libelle: "Infraction", valeur: a.infractionLe && (a.heureInconnue ? `${formatDate(a.infractionLe)} (heure inconnue)` : formatDateHeure(a.infractionLe)) },
              { libelle: "Plaque lue", valeur: a.immatriculationLue },
              { libelle: "Nature", valeur: a.nature },
              { libelle: "Lieu", valeur: a.lieu },
              { libelle: "Montant", valeur: a.montantCentimes != null ? formatEuros(a.montantCentimes) : null },
              { libelle: "Désigné le", valeur: a.dateDesignation && formatDateHeure(a.dateDesignation) },
              { libelle: "Frais de gestion", valeur: a.fraisGestionCentimes ? `${formatEuros(a.fraisGestionCentimes)}${fraisGestion.length ? " (ajoutés au contrat)" : ""}` : null },
              { libelle: "Doublon de", valeur: a.doublonDe && <Link href={`/location/amendes/${a.doublonDe.id}`} className="text-primary underline">l&apos;avis n° {a.doublonDe.numeroAvis}</Link> },
              { libelle: "Lecture", valeur: a.ocrTokensEntree != null ? `${formatNombre(a.ocrTokensEntree)} + ${formatNombre(a.ocrTokensSortie ?? 0)} jetons` : null },
            ]}
          />
          {a.fichiers.length > 1 && (
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {a.fichiers.map((f) => (
                <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                  <ExternalLink className="size-4" /> {f.nomOriginal}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" /> Conducteur
          </CardTitle>
          <CardDescription>Pour la désignation sur le site de l&apos;ANTAI.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {client ? (
            <div className="flex flex-col gap-1">
              <Link href={`/clients/${client.id}`} className="font-semibold hover:underline">
                {[client.prenom, client.nom].filter(Boolean).join(" ")}
              </Link>
              {client.dateNaissance && <span>Né(e) le {formatDate(client.dateNaissance)}{client.lieuNaissance ? ` à ${client.lieuNaissance}` : ""}</span>}
              {client.numeroPermis && <span>Permis n° {client.numeroPermis}</span>}
              {client.adresse && <span>{[client.adresse, client.adresseComplement, [client.codePostal, client.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>}
              {client.telephone && <span>{client.telephone}</span>}
              {a.contrat && (
                <Link href={`/location/contrats/${a.contrat.id}`} className="mt-1 text-primary hover:underline">
                  Location {a.contrat.numero}
                </Link>
              )}
              {manquants.length > 0 && (
                <span className="mt-1 text-destructive">
                  Fiche incomplète pour l&apos;ANTAI : {manquants.join(", ")} —{" "}
                  <Link href={`/clients/${client.id}/modifier`} className="font-medium underline">
                    compléter
                  </Link>
                </span>
              )}
              {refacture && <span className="mt-1 font-medium text-success">Refacturé sur la location.</span>}
            </div>
          ) : (
            <p className="text-muted-foreground">{a.statut === "PAYEE" ? "Aucun conducteur désigné : payé par la société." : "Aucune location rattachée à ce PV."}</p>
          )}
        </CardContent>
      </Card>

      {a.note && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="size-5 text-primary" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm" data-testid="notes-pv">
              {a.note}
            </p>
          </CardContent>
        </Card>
      )}

      <h2 className="mt-2 font-semibold">Modifier</h2>
      {a.vehiculeId && a.infractionLe ? (
        <FormulaireAmende
          id={a.id}
          vehicules={vehicules}
          valeurs={{
            vehiculeId: a.vehiculeId,
            infractionLe: dateVersSaisieParis(a.infractionLe),
            lieu: a.lieu ?? "",
            montant: centimesVersSaisie(a.montantCentimes),
            numeroAvis: a.numeroAvis ?? "",
            dateReception: dateCalendaireVersISO(a.dateReception),
            dateLimite: dateCalendaireVersISO(a.dateLimite),
            statut: (STATUTS_AMENDE_MANUELS as readonly string[]).includes(a.statut) || a.statut === "REFACTUREE" ? (a.statut as SaisieAmende["statut"]) : "A_VALIDER",
            note: a.note ?? "",
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Véhicule ou date encore inconnus : corrigez ce PV dans{" "}
          <Link href="/location/amendes/a-valider" className="text-primary underline">
            À valider
          </Link>
          .
        </p>
      )}
    </div>
  );
}
