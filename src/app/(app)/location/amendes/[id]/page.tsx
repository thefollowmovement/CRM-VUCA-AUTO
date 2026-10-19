import { ArrowLeft, ExternalLink, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsAmende } from "@/components/incidents/actions-amende";
import { FormulaireAmende } from "@/components/incidents/formulaire-amende";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dateVersSaisieParis } from "@/lib/dates";
import { centimesVersSaisie, dateCalendaireVersISO, formatDate, formatDateHeure, formatEuros } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_STATUT_AMENDE } from "@/lib/validations/paiement";
import { obtenirAmende, vehiculesPourIncidents } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "PV" };

export default async function PageAmende({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const [a, vehicules] = await Promise.all([obtenirAmende(id), vehiculesPourIncidents()]);
  if (!a) notFound();
  const client = a.client;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/location/amendes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> PV
      </Link>
      <EnTetePage
        titre={`PV du ${formatDateHeure(a.infractionLe)} · ${formatEuros(a.montantCentimes)}`}
        description={
          <>
            {nomVehicule(a.vehicule)} {a.vehicule.immatriculation && `· ${a.vehicule.immatriculation}`} · <Badge>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
          </>
        }
        actions={<ActionsAmende id={a.id} statut={a.statut} refacturable={!!a.contratId && a.frais.length === 0} estAdmin={u.role === "ADMIN"} />}
      />
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
              {client.adresse && <span>{[client.adresse, [client.codePostal, client.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>}
              {client.telephone && <span>{client.telephone}</span>}
              {a.contrat && (
                <Link href={`/location/contrats/${a.contrat.id}`} className="mt-1 text-primary hover:underline">
                  Location {a.contrat.numero}
                </Link>
              )}
              {a.frais.length > 0 && <span className="mt-1 font-medium text-success">Refacturé sur la location.</span>}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune location à cette date : le véhicule était à l&apos;agence.</p>
          )}
        </CardContent>
      </Card>
      {a.fichiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Avis de contravention</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {a.fichiers.map((f) => (
              <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                <ExternalLink className="size-4" /> {f.nomOriginal}
              </a>
            ))}
          </CardContent>
        </Card>
      )}
      <h2 className="mt-2 font-semibold">Modifier</h2>
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
          statut: a.statut,
          note: a.note ?? "",
        }}
      />
    </div>
  );
}
