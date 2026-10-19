import { ArrowLeft, ClipboardCheck, HandCoins, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EncadreAlertes } from "@/components/clients/alertes-client";
import { ActionsContrat } from "@/components/location/actions-contrat";
import { BadgeContrat } from "@/components/location/badge-contrat";
import { RecapPrix } from "@/components/location/recap-prix";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { ListeInfos } from "@/components/ui/liste-infos";
import { VignetteVehicule } from "@/components/vehicules/vignette-vehicule";
import { alertesClient } from "@/lib/calculs/clients";
import { joursFactures, kmInclusTotal } from "@/lib/calculs/location";
import { statutAffiche } from "@/lib/contrat";
import { db } from "@/lib/db";
import { formatDate, formatDateHeure, formatEuros, formatNombre } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_MODE_CAUTION, LIBELLES_TYPE_LOCATION } from "@/lib/validations/location";
import { obtenirContrat } from "@/server/requetes/contrats";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await db.contratLocation.findUnique({ where: { id: (await params).id }, select: { numero: true } });
  return { title: c?.numero ?? "Contrat" };
}

const LIBELLES_STATUT_CAUTION = {
  A_ENCAISSER: "À encaisser",
  ENCAISSEE: "Encaissée",
  RESTITUEE: "Restituée",
  RETENUE_PARTIELLE: "Retenue en partie",
  RETENUE_TOTALE: "Retenue",
} as const;

export default async function PageContrat({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const [c, reglages] = await Promise.all([obtenirContrat(id), lireReglages()]);
  if (!c) notFound();
  const statut = statutAffiche(c.statut, c.retourPrevuLe);
  const nomCli = [c.client.prenom, c.client.nom].filter(Boolean).join(" ");
  const alertes = c.statut === "RESERVATION" || c.statut === "CONFIRMEE" ? alertesClient(c.client, new Date(), reglages.anciennetePermisMinAnnees) : [];
  const joursTotal = joursFactures(c.departPrevuLe, c.retourPrevuLe, reglages.toleranceRetardMinutes);
  const kmTotal = c.kilometrageIllimite ? null : kmInclusTotal(c.type, c.kmInclusParUnite, { unites: c.dureeFacturee, joursSupplementaires: c.joursSupplementaires, joursTotal });
  const totalOptions = c.options.reduce((a, o) => a + o.totalCentimes, 0);
  const base = c.prixTotalCentimes + c.remiseCentimes - totalOptions - c.fraisLivraisonCentimes;
  const encaisse = c.paiements.reduce((a, p) => a + (p.nature === "REMBOURSEMENT" ? -p.montantCentimes : p.montantCentimes), 0);

  return (
    <>
      <Link href="/location/contrats" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Contrats
      </Link>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {c.numero} <BadgeContrat statut={statut} />
            {c.archiveLe && <Badge variant="warning">Archivé</Badge>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Location {LIBELLES_TYPE_LOCATION[c.type].toLowerCase()} · créée le {formatDate(c.creeLe)}
          </p>
        </div>
        <ActionsContrat id={c.id} numero={c.numero} statut={c.statut} archive={!!c.archiveLe} estAdmin={u.role === "ADMIN"} />
      </div>
      {c.statut === "ANNULEE" && (
        <p className="mb-4 rounded-lg border bg-muted p-3 text-sm">
          Annulée le {formatDateHeure(c.annuleLe)}
          {c.motifAnnulation && ` : ${c.motifAnnulation}`}
        </p>
      )}
      <EncadreAlertes alertes={alertes} className="mb-4" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <Link href={`/clients/${c.client.id}`} className="font-semibold hover:underline">
                  {nomCli}
                </Link>
                {c.client.telephone && (
                  <a href={`tel:${c.client.telephone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-primary">
                    <Phone className="size-3.5" /> {c.client.telephone}
                  </a>
                )}
                {c.client.numeroPermis && <span className="text-muted-foreground">Permis n° {c.client.numeroPermis}</span>}
                {c.conducteursAdditionnels.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground">Conducteurs additionnels</p>
                    {c.conducteursAdditionnels.map(({ client: x }) => (
                      <Link key={x.id} href={`/clients/${x.id}`} className="block hover:underline">
                        {[x.prenom, x.nom].filter(Boolean).join(" ")}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Véhicule</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/vehicules/${c.vehicule.id}/location`} className="flex items-center gap-3 hover:underline">
                  <VignetteVehicule photoId={c.vehicule.fichiers[0]?.id ?? null} alt={nomVehicule(c.vehicule)} className="size-14 shrink-0 rounded-md" />
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold">{nomVehicule(c.vehicule)}</span>
                    <span className="block text-muted-foreground">{c.vehicule.immatriculation ?? "Sans immatriculation"}</span>
                    {c.vehicule.kilometrageActuel !== null && <span className="block text-muted-foreground">{formatNombre(c.vehicule.kilometrageActuel)} km</span>}
                  </span>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dates et conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <ListeInfos
                elements={[
                  { libelle: "Départ prévu", valeur: formatDateHeure(c.departPrevuLe) },
                  { libelle: "Retour prévu", valeur: formatDateHeure(c.retourPrevuLe) },
                  { libelle: "Départ réel", valeur: c.departReelLe && formatDateHeure(c.departReelLe) },
                  { libelle: "Retour réel", valeur: c.retourReelLe && formatDateHeure(c.retourReelLe) },
                  { libelle: "Lieu de départ", valeur: c.lieuDepart },
                  { libelle: "Lieu de retour", valeur: c.lieuRetour },
                  { libelle: "Livraison", valeur: c.livraison ? `Oui (${formatEuros(c.fraisLivraisonCentimes)})` : null },
                  {
                    libelle: "Kilométrage",
                    valeur: c.kilometrageIllimite
                      ? "Illimité"
                      : kmTotal !== null
                        ? `${formatNombre(kmTotal)} km inclus (${formatNombre(c.kmInclusParUnite)} / ${c.type === "MENSUELLE" ? "mois" : "jour"})`
                        : null,
                  },
                  { libelle: "Km supplémentaire", valeur: c.prixKmSupCentimes !== null ? formatEuros(c.prixKmSupCentimes) : null },
                  { libelle: "Caution", valeur: `${formatEuros(c.cautionCentimes)}${c.modeCaution ? ` · ${LIBELLES_MODE_CAUTION[c.modeCaution]}` : ""}` },
                  { libelle: "État de la caution", valeur: c.cautionCentimes > 0 ? LIBELLES_STATUT_CAUTION[c.statutCaution] : null },
                  { libelle: "Franchise", valeur: c.franchiseCentimes !== null ? formatEuros(c.franchiseCentimes) : null },
                  { libelle: "Acompte demandé", valeur: c.acompteCentimes ? formatEuros(c.acompteCentimes) : null },
                  { libelle: "Échéance mensuelle", valeur: c.jourEcheanceMensuelle ? `le ${c.jourEcheanceMensuelle} du mois` : null },
                ]}
              />
              {c.notes && <p className="mt-4 whitespace-pre-line rounded-md bg-muted p-3 text-sm">{c.notes}</p>}
            </CardContent>
          </Card>

          <EtatVide
            icone={ClipboardCheck}
            titre="Départ et retour"
            description="L'assistant de départ (état des lieux, photos, signatures) et l'assistant de retour arrivent en Phase 5."
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Prix</CardTitle>
            </CardHeader>
            <CardContent>
              <RecapPrix
                r={{
                  type: c.type,
                  tarifCentimes: c.tarifCentimes,
                  tarifJournalierCentimes: c.tarifJournalierCentimes,
                  unites: c.dureeFacturee,
                  joursSupplementaires: c.joursSupplementaires,
                  montantBaseCentimes: base,
                  options: c.options,
                  remiseCentimes: c.remiseCentimes,
                  fraisLivraisonCentimes: c.fraisLivraisonCentimes,
                  prixTotalCentimes: c.prixTotalCentimes,
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="size-5 text-primary" /> Paiements
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Encaissé : <span className="font-semibold text-foreground">{formatEuros(encaisse)}</span> sur {formatEuros(c.prixTotalCentimes)}. La saisie
              des paiements, l&apos;échéancier et les reçus arrivent en Phase 6.
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
