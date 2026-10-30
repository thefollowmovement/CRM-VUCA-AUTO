import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsSinistre } from "@/components/incidents/actions-sinistre";
import { FormulaireSinistre } from "@/components/incidents/formulaire-sinistre";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeInfos } from "@/components/ui/liste-infos";
import { db } from "@/lib/db";
import { dateVersSaisieParis } from "@/lib/dates";
import { centimesVersSaisie, formatDateHeure, formatEuros } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_STATUT_SINISTRE } from "@/lib/validations/paiement";
import { obtenirSinistre, vehiculesPourIncidents } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "Sinistre" };

export default async function PageSinistre({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const [s, vehicules] = await Promise.all([obtenirSinistre(id), vehiculesPourIncidents()]);
  if (!s) notFound();
  const franchiseFacturee = s.contratId ? await db.fraisSupplementaire.findFirst({ where: { contratId: s.contratId, note: `sinistre:${s.id}` }, select: { id: true } }) : null;
  const client = s.contrat?.client;
  const nomClient = client ? [client.prenom, client.nom].filter(Boolean).join(" ") : "";
  const photos = s.fichiers.filter((f) => f.typeMime.startsWith("image/"));
  const documents = s.fichiers.filter((f) => !f.typeMime.startsWith("image/"));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/location/sinistres" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Sinistres
      </Link>
      <EnTetePage
        titre={`Sinistre du ${formatDateHeure(s.survenuLe)}`}
        description={
          <>
            <Link href={`/vehicules/${s.vehiculeId}/dommages`} className="hover:underline">
              {nomVehicule(s.vehicule)} {s.vehicule.immatriculation && `· ${s.vehicule.immatriculation}`}
            </Link>{" "}
            · <Badge>{LIBELLES_STATUT_SINISTRE[s.statut]}</Badge>
          </>
        }
        actions={<ActionsSinistre id={s.id} franchiseRefacturable={!!s.contratId && !!s.franchiseRefactureeCentimes && !franchiseFacturee} estAdmin={u.role === "ADMIN"} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm whitespace-pre-line">{s.description}</p>
          <ListeInfos
            elements={[
              { libelle: "Lieu", valeur: s.lieu },
              {
                libelle: "Location",
                valeur: s.contrat ? (
                  <Link href={`/location/contrats/${s.contrat.id}`} className="text-primary hover:underline">
                    {s.contrat.numero} · {nomClient}
                  </Link>
                ) : (
                  "Aucune (véhicule à l'agence)"
                ),
              },
              { libelle: "Coût estimé", valeur: s.coutEstimeCentimes != null ? formatEuros(s.coutEstimeCentimes) : null },
              {
                libelle: "Franchise refacturée",
                valeur: s.franchiseRefactureeCentimes ? `${formatEuros(s.franchiseRefactureeCentimes)}${franchiseFacturee ? " · ajoutée aux frais" : " · pas encore facturée"}` : null,
              },
              { libelle: "Assurance", valeur: s.declareAssurance ? `Déclaré${s.numeroDossierAssurance ? ` · dossier ${s.numeroDossierAssurance}` : ""}` : "Non déclaré" },
              { libelle: "Indemnité encaissée", valeur: s.indemniteAssuranceCentimes ? formatEuros(s.indemniteAssuranceCentimes) : null },
            ]}
          />
        </CardContent>
      </Card>
      {s.fichiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos et documents</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((f) => (
                  <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/fichiers/${f.id}?taille=mini`} alt={f.nomOriginal} className="aspect-square w-full rounded-lg border object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
            {documents.map((f) => (
              <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <FileText className="size-4" /> {f.nomOriginal}
              </a>
            ))}
          </CardContent>
        </Card>
      )}
      <h2 className="mt-2 font-semibold">Modifier</h2>
      <FormulaireSinistre
        id={s.id}
        vehicules={vehicules}
        locationActuelle={s.contrat ? { contratId: s.contrat.id, numero: s.contrat.numero, client: nomClient } : null}
        valeurs={{
          vehiculeId: s.vehiculeId,
          contratId: s.contratId ?? "",
          survenuLe: dateVersSaisieParis(s.survenuLe),
          lieu: s.lieu ?? "",
          description: s.description,
          coutEstime: centimesVersSaisie(s.coutEstimeCentimes),
          franchiseRefacturee: centimesVersSaisie(s.franchiseRefactureeCentimes),
          declareAssurance: s.declareAssurance,
          numeroDossierAssurance: s.numeroDossierAssurance ?? "",
          indemniteAssurance: centimesVersSaisie(s.indemniteAssuranceCentimes),
          statut: s.statut,
          note: s.note ?? "",
        }}
      />
    </div>
  );
}
