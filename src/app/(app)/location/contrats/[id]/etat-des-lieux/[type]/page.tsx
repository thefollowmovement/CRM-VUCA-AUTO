import { ArrowLeft, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SchemaVehicule } from "@/components/etat-des-lieux/schema-vehicule";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeInfos } from "@/components/ui/liste-infos";
import { db } from "@/lib/db";
import { formatDateHeure, formatNombre } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { COULEURS_GRAVITE, LIBELLES_GRAVITE } from "@/lib/schema-vehicule";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_PROPRETE, PHOTOS_GUIDEES } from "@/lib/validations/etat-des-lieux";
import { dommagesVehicule, etatDesLieuxSigne } from "@/server/requetes/etats-des-lieux";

export const metadata: Metadata = { title: "État des lieux" };

const LIBELLE_PHOTO: Record<string, string> = { EDL_COMPTEUR: "Compteur", EDL_LIBRE: "Photo libre", ...Object.fromEntries(PHOTOS_GUIDEES.map((p) => [p.categorie, p.libelle])) };

export default async function PageEtatDesLieux({ params }: { params: Promise<{ id: string; type: string }> }) {
  await exigerRolePage(ROLES_GESTION);
  const { id, type: t } = await params;
  const type = t === "retour" ? "RETOUR" : t === "depart" ? "DEPART" : null;
  if (!type) notFound();
  const [edl, contrat] = await Promise.all([
    etatDesLieuxSigne(id, type),
    db.contratLocation.findUnique({ where: { id }, select: { numero: true, vehicule: { select: { id: true, marque: true, modele: true, version: true, immatriculation: true } } } }),
  ]);
  if (!edl || !contrat || !edl.verrouille) notFound();

  // Dommages présents à la date de l'état des lieux : constatés avant, non réparés à cette date
  const { actuels, repares } = await dommagesVehicule(contrat.vehicule.id);
  const date = edl.signeLe ?? edl.realiseLe;
  const presents = [...actuels, ...repares]
    .filter((d) => d.constateLe <= date && (!d.repareLe || d.repareLe > date))
    .sort((a, b) => a.numero - b.numero);
  const photos = edl.photos.filter((p) => p.categorie !== "SIGNATURE");

  return (
    <>
      <Link href={`/location/contrats/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {contrat.numero}
      </Link>
      <EnTetePage
        titre={`État des lieux de ${type === "DEPART" ? "départ" : "retour"}`}
        description={`${contrat.numero} · ${nomVehicule(contrat.vehicule)} · signé le ${formatDateHeure(edl.signeLe)}${edl.realisePar ? ` par ${edl.realisePar.nom}` : ""}`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Relevés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ListeInfos
              elements={[
                { libelle: "Kilométrage", valeur: `${formatNombre(edl.kilometrage)} km` },
                { libelle: "Carburant", valeur: edl.niveauCarburantHuitiemes !== null ? `${edl.niveauCarburantHuitiemes}/8` : null },
                { libelle: "Batterie", valeur: edl.niveauBatteriePct !== null ? `${edl.niveauBatteriePct} %` : null },
                { libelle: "Propreté intérieure", valeur: edl.propreteInterieure && LIBELLES_PROPRETE[edl.propreteInterieure] },
                { libelle: "Propreté extérieure", valeur: edl.propreteExterieure && LIBELLES_PROPRETE[edl.propreteExterieure] },
              ]}
            />
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-1 text-sm sm:grid-cols-2">
              {edl.checklist.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  {l.present ? <Check className="size-4 text-success" /> : <X className="size-4 text-destructive" />}
                  <span className={l.present ? "" : "text-destructive"}>
                    {l.libelle}
                    {l.quantite !== null && l.present && ` × ${l.quantite}`}
                  </span>
                </li>
              ))}
            </ul>
            {edl.remarques && <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{edl.remarques}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dommages ({presents.length})</CardTitle>
            <CardDescription>Cerclés en rouge : constatés lors de cet état des lieux.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SchemaVehicule dommages={presents.map((d) => ({ ...d, nouveau: d.etatDesLieuxId === edl.id }))} />
            <ul className="flex flex-col divide-y text-sm">
              {presents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: COULEURS_GRAVITE[d.gravite] }}>
                    {d.numero}
                  </span>
                  <span className="min-w-0 flex-1">
                    {d.libelle} <span className="text-muted-foreground">· {LIBELLES_GRAVITE[d.gravite]}</span>
                    {d.etatDesLieuxId === edl.id && <span className="ml-1 font-medium text-destructive">· nouveau</span>}
                  </span>
                  {d.photoIds[0] && (
                    <a href={`/api/fichiers/${d.photoIds[0]}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/fichiers/${d.photoIds[0]}?taille=mini`} alt="" className="size-10 rounded object-cover" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Photos ({photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <li key={p.id}>
                  <a href={`/api/fichiers/${p.id}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/fichiers/${p.id}?taille=mini`} alt={LIBELLE_PHOTO[p.categorie] ?? ""} className="aspect-[4/3] w-full object-cover" />
                  </a>
                  <p className="mt-1 text-center text-xs">{LIBELLE_PHOTO[p.categorie] ?? p.categorie}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Signatures</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {[
              { libelle: `Client : ${edl.nomSignataireClient ?? ""}`, id: edl.signatureClientId },
              { libelle: "Loueur (VUCA AUTO)", id: edl.signatureLoueurId },
            ].map((s) => (
              <div key={s.libelle}>
                <p className="mb-1 text-sm font-medium">{s.libelle}</p>
                {s.id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/fichiers/${s.id}`} alt={s.libelle} className="h-32 w-full rounded-lg border bg-white object-contain" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
