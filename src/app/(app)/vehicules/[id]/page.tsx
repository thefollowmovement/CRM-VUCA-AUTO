import { BadgeEuro, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Factures } from "@/components/documents/factures";
import { CarteRentabilite } from "@/components/finance/carte-rentabilite";
import { CarteEstimations } from "@/components/vehicules/carte-estimations";
import { GaleriePhotos } from "@/components/vehicules/galerie-photos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeInfos } from "@/components/ui/liste-infos";
import { joursEnStock } from "@/lib/calculs/vehicule";
import { db } from "@/lib/db";
import { aujourdhuiISO, formatDate, formatEuros, formatNombre } from "@/lib/format";
import { LIBELLES_MODE_PAIEMENT } from "@/lib/validations/finance";
import {
  LIBELLES_BOITE,
  LIBELLES_CARBURANT,
  LIBELLES_CRITAIR,
  LIBELLES_PROVENANCE,
  nomVehicule,
} from "@/lib/vehicule";
import { bilanVehicule } from "@/server/requetes/rentabilite";
import { obtenirVehicule } from "@/server/requetes/vehicules";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const v = await db.vehicule.findUnique({ where: { id: (await params).id }, select: { marque: true, modele: true, version: true } });
  return { title: v ? nomVehicule(v) : "Véhicule" };
}

export default async function PageResumeVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await obtenirVehicule(id);
  if (!v) notFound();
  const [bilan, factures] = await Promise.all([
    bilanVehicule(id),
    db.facture.findMany({ where: { vehiculeId: id, type: "VENTE_VEHICULE" }, orderBy: { creeLe: "asc" }, select: { id: true, numero: true, dateEmission: true, totalCentimes: true, annuleeLe: true, motifAnnulation: true } }),
  ]);
  if (!bilan) notFound();

  const photos = v.fichiers.filter((f) => f.categorie === "PHOTO_VEHICULE");
  const vendu = bilan.vendu;
  const location = v.typeExploitation !== "ACHAT_REVENTE";
  const modifiable = v.statut !== "ARCHIVE";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <GaleriePhotos vehiculeId={v.id} photos={photos} modifiable={modifiable} />

        <Card>
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <ListeInfos
              elements={[
                { libelle: "Immatriculation", valeur: v.immatriculation },
                { libelle: "VIN", valeur: v.vin && <span className="font-mono text-xs">{v.vin}</span> },
                { libelle: "Année", valeur: v.annee },
                { libelle: "1re mise en circulation", valeur: v.dateMiseEnCirculation && formatDate(v.dateMiseEnCirculation) },
                { libelle: "Carburant", valeur: v.carburant && LIBELLES_CARBURANT[v.carburant] },
                { libelle: "Boîte", valeur: v.boite && LIBELLES_BOITE[v.boite] },
                { libelle: "Couleur", valeur: v.couleur },
                { libelle: "Places", valeur: v.nombrePlaces },
                { libelle: "Puissance fiscale", valeur: v.puissanceFiscale && `${v.puissanceFiscale} CV` },
                { libelle: "Crit'Air", valeur: v.critAir && LIBELLES_CRITAIR[v.critAir] },
                { libelle: "Kilométrage actuel", valeur: v.kilometrageActuel !== null ? `${formatNombre(v.kilometrageActuel)} km` : null },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Achat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ListeInfos
              elements={[
                { libelle: "Date d'achat", valeur: formatDate(v.dateAchat) },
                { libelle: "Prix d'achat", valeur: formatEuros(v.prixAchatCentimes) },
                { libelle: "Kilométrage à l'achat", valeur: v.kilometrageAchat !== null ? `${formatNombre(v.kilometrageAchat)} km` : null },
                { libelle: "Provenance", valeur: v.provenance && LIBELLES_PROVENANCE[v.provenance] },
                { libelle: "Vendeur", valeur: v.nomVendeur },
                {
                  libelle: "Annonce",
                  valeur: v.lienAnnonce && (
                    <a href={v.lienAnnonce} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">
                      Voir l&apos;annonce <ExternalLink className="size-3" />
                    </a>
                  ),
                },
              ]}
            />
            {v.notesAchat && <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{v.notesAchat}</p>}
          </CardContent>
        </Card>

        {location && (
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>Valeurs par défaut des contrats.</CardDescription>
            </CardHeader>
            <CardContent>
              <ListeInfos
                elements={[
                  { libelle: "Tarif journalier", valeur: v.tarifJournalierCentimes !== null ? formatEuros(v.tarifJournalierCentimes) : null },
                  { libelle: "Tarif hebdomadaire", valeur: v.tarifHebdoCentimes !== null ? formatEuros(v.tarifHebdoCentimes) : null },
                  { libelle: "Tarif mensuel", valeur: v.tarifMensuelCentimes !== null ? formatEuros(v.tarifMensuelCentimes) : null },
                  { libelle: "Km inclus / jour", valeur: v.kmInclusParJour },
                  { libelle: "Km inclus / mois", valeur: v.kmInclusParMois },
                  { libelle: "Km supplémentaire", valeur: v.prixKmSupCentimes !== null ? formatEuros(v.prixKmSupCentimes) : null },
                  { libelle: "Caution", valeur: v.cautionDefautCentimes !== null ? formatEuros(v.cautionDefautCentimes) : null },
                  { libelle: "Franchise", valeur: v.franchiseDefautCentimes !== null ? formatEuros(v.franchiseDefautCentimes) : null },
                  { libelle: "Mise en location", valeur: v.dateMiseEnLocation && formatDate(v.dateMiseEnLocation) },
                ]}
              />
            </CardContent>
          </Card>
        )}

        {v.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm">{v.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <CarteRentabilite
          rentabilite={bilan.rentabilite}
          totalDepensesCentimes={bilan.totalDepenses}
          autresRevenusCentimes={bilan.autresRevenus}
          jours={joursEnStock(v.dateAchat, v.dateVente)}
          action={
            modifiable && !vendu ? (
              <Button size="sm" asChild>
                <Link href={`/vehicules/${v.id}/vendre`}>
                  <BadgeEuro /> Vendre
                </Link>
              </Button>
            ) : undefined
          }
        />

        {vendu && (
          <Card>
            <CardHeader>
              <CardTitle>Vente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ListeInfos
                className="sm:grid-cols-2"
                elements={[
                  { libelle: "Date de vente", valeur: formatDate(v.dateVente) },
                  { libelle: "Prix de vente", valeur: formatEuros(v.prixVenteCentimes) },
                  { libelle: "Kilométrage", valeur: v.kilometrageVente !== null ? `${formatNombre(v.kilometrageVente)} km` : null },
                  { libelle: "Paiement", valeur: v.modePaiementVente && LIBELLES_MODE_PAIEMENT[v.modePaiementVente] },
                  { libelle: "Acheteur", valeur: v.acheteurNom },
                  { libelle: "Téléphone", valeur: v.acheteurTelephone },
                  { libelle: "Email", valeur: v.acheteurEmail },
                  { libelle: "Adresse", valeur: v.acheteurAdresse },
                ]}
              />
              {v.notesVente && <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm">{v.notesVente}</p>}
              <div className="border-t pt-3">
                <Factures cible={{ type: "vente", id: v.id }} factures={factures} peutEmettre={v.statut === "VENDU"} />
              </div>
            </CardContent>
          </Card>
        )}

        <CarteEstimations vehiculeId={v.id} estimations={v.estimations} aujourdhui={aujourdhuiISO()} modifiable={modifiable} />
      </div>
    </div>
  );
}
