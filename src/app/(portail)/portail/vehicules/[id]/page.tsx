import { ArrowLeft, Car } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApercuAdmin } from "@/components/portail/apercu-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeInfos } from "@/components/ui/liste-infos";
import { BadgeStatut } from "@/components/vehicules/badge-statut";
import { formatDate, formatEuros, formatNombre, formatPourcentageBp } from "@/lib/format";
import { exigerRolePage } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { LIBELLES_TYPE_VERSEMENT } from "@/lib/validations/finance";
import { LIBELLES_CARBURANT } from "@/lib/vehicule";
import { partenairePortail, vehiculePortail } from "@/server/requetes/portail";

export const metadata: Metadata = { title: "Véhicule" };

export default async function PageVehiculePortail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ partenaire?: string }> }) {
  const u = await exigerRolePage(["INVESTISSEUR_LECTURE", "ADMIN"]);
  const { partenaire } = await partenairePortail(u, (await searchParams).partenaire);
  if (!partenaire) notFound();
  const d = await vehiculePortail(partenaire.id, (await params).id);
  if (!d) notFound();
  const { vehicule: v, rentabilite: r, situation: s } = d;
  const apercu = u.role === "ADMIN";
  const retour = `/portail${apercu ? `?partenaire=${partenaire.id}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      {apercu && <ApercuAdmin nom={partenaire.nom} partenaireId={partenaire.id} />}
      <Link href={retour} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Mes véhicules
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{d.nom}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {v.immatriculation ?? "Sans immatriculation"} <BadgeStatut statut={v.statut} />
        </p>
      </div>

      {v.fichiers.length > 0 ? (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1">
          {v.fichiers.map((f) => (
            <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/fichiers/${f.id}?taille=mini`} alt={`Photo de ${d.nom}`} className="h-40 w-56 rounded-lg border object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
          <Car className="size-10 text-muted-foreground" aria-hidden />
        </div>
      )}

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">Votre part</CardTitle>
          <CardDescription>
            {d.vendu ? "Véhicule vendu : montants définitifs." : "Prévisionnel tant que le véhicule n'est pas vendu."}
            {d.commissionBp > 0 && ` Commission de gestion VUCA AUTO : ${formatPourcentageBp(d.commissionBp)} du bénéfice.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListeInfos
            elements={[
              { libelle: "Votre investissement", valeur: formatEuros(s.investiCentimes) },
              { libelle: "dont participation à l'achat", valeur: formatEuros(s.achatCentimes) },
              { libelle: "dont dépenses payées", valeur: s.depensesCentimes ? formatEuros(s.depensesCentimes) : null },
              { libelle: "Part du bénéfice", valeur: s.partBeneficeBp === null ? null : formatPourcentageBp(s.partBeneficeBp) },
              {
                libelle: d.vendu ? "Votre bénéfice" : "Bénéfice prévisionnel",
                valeur: s.beneficeCentimes === null ? null : <span className={cn(s.beneficeCentimes < 0 && "text-destructive")}>{formatEuros(s.beneficeCentimes)}</span>,
              },
              { libelle: "À vous reverser", valeur: formatEuros(s.aReverserCentimes) },
              { libelle: "Déjà versé", valeur: formatEuros(s.verseCentimes) },
              { libelle: "Reste dû", valeur: s.resteDuCentimes === null ? null : <strong>{formatEuros(s.resteDuCentimes)}</strong> },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            <ListeInfos
              className="sm:grid-cols-2"
              elements={[
                { libelle: "Année", valeur: v.annee },
                { libelle: "Carburant", valeur: v.carburant && LIBELLES_CARBURANT[v.carburant] },
                { libelle: "Kilométrage", valeur: v.kilometrageActuel !== null ? `${formatNombre(v.kilometrageActuel)} km` : null },
                { libelle: "Acheté le", valeur: formatDate(v.dateAchat) },
                { libelle: "Vendu le", valeur: v.dateVente ? formatDate(v.dateVente) : null },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rentabilité du véhicule</CardTitle>
            <CardDescription>{r.previsionnel ? "Prévisionnel (prix de vente visé)." : "Chiffres réels."}</CardDescription>
          </CardHeader>
          <CardContent>
            <ListeInfos
              className="sm:grid-cols-2"
              elements={[
                { libelle: "Prix d'achat", valeur: formatEuros(v.prixAchatCentimes) },
                { libelle: "Dépenses", valeur: formatEuros(r.coutDeRevientCentimes - v.prixAchatCentimes) },
                { libelle: "Coût de revient", valeur: formatEuros(r.coutDeRevientCentimes) },
                { libelle: d.vendu ? "Prix de vente" : "Prix de vente visé", valeur: r.prixVenteRetenuCentimes === null ? null : formatEuros(r.prixVenteRetenuCentimes) },
                { libelle: "Bénéfice", valeur: r.beneficeCentimes === null ? null : formatEuros(r.beneficeCentimes) },
                { libelle: "Marge", valeur: r.margeBp === null ? null : formatPourcentageBp(r.margeBp) },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {d.occupation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>Depuis la mise en location le {formatDate(d.occupation.depuis)}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ListeInfos
              elements={[
                { libelle: "Revenus encaissés", valeur: formatEuros(d.occupation.revenusCentimes) },
                { libelle: "Taux d'occupation", valeur: d.occupation.tauxBp === null ? null : formatPourcentageBp(d.occupation.tauxBp) },
                { libelle: "Jours loués", valeur: `${d.occupation.joursLoues} / ${d.occupation.joursDisponibles}` },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {d.depensesParCategorie.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune dépense.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {d.depensesParCategorie.map((c) => (
                  <li key={c.categorie} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate">{c.categorie}</span>
                    <span className="tabular-nums">{formatEuros(c.montantCentimes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vos versements sur ce véhicule</CardTitle>
          </CardHeader>
          <CardContent>
            {v.versements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun versement.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {v.versements.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1">
                      {formatDate(x.date)} · {LIBELLES_TYPE_VERSEMENT[x.type]}
                    </span>
                    <span className="font-medium tabular-nums">{formatEuros(x.montantCentimes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
