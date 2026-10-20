import { Eye, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { FormulaireAnnonce } from "@/components/annonces/formulaire-annonce";
import { PhotosAnnonce, type PhotoAnnonce } from "@/components/annonces/photos-annonce";
import { PublicationAnnonce } from "@/components/annonces/publication-annonce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { annonceVersSaisie } from "@/lib/annonce-formulaire";
import { db } from "@/lib/db";
import { urlAnnonce } from "@/lib/domaines";
import { dateCalendaireVersISO, formatNombre } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import type { Recadrage } from "@/lib/site/recadrage";
import { LIBELLES_STATUT } from "@/lib/vehicule";
import { annoncePourVehicule, estPubliable } from "@/server/site/annonces";
import { lireReglagesSite } from "@/server/site/reglages";
import { statsAnnonce } from "@/server/site/statistiques";

export const metadata = { title: "Annonce" };

/** Onglet « Annonce » : ce que le site public montre de ce véhicule. */
export default async function PageAnnonce({ params }: { params: Promise<{ id: string }> }) {
  await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const annonce = await annoncePourVehicule(id);
  if (!annonce) notFound();
  const [v, reglages, stats] = await Promise.all([
    db.vehicule.findUnique({
      where: { id },
      select: {
        id: true, marque: true, modele: true, version: true, annee: true, statut: true, kilometrageActuel: true, kilometrageAchat: true,
        carburant: true, boite: true, couleur: true, nombrePlaces: true, dateMiseEnCirculation: true,
        fichiers: {
          where: { categorie: "PHOTO_VEHICULE" },
          select: { id: true, publique: true, ordrePublic: true, ordre: true, largeur: true, hauteur: true, recadrage: true, creeLe: true },
          orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
        },
      },
    }),
    lireReglagesSite(),
    statsAnnonce(annonce.id),
  ]);
  if (!v) notFound();

  const versPhoto = (f: (typeof v.fichiers)[number]): PhotoAnnonce => ({
    id: f.id,
    publique: f.publique,
    largeur: f.largeur,
    hauteur: f.hauteur,
    recadrage: (f.recadrage as Recadrage | null) ?? null,
  });
  const publiques = v.fichiers.filter((f) => f.publique).sort((a, b) => a.ordrePublic - b.ordrePublic || a.creeLe.getTime() - b.creeLe.getTime()).map(versPhoto);
  const autres = v.fichiers.filter((f) => !f.publique).map(versPhoto);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PublicationAnnonce
        vehiculeId={v.id}
        publiee={annonce.publiee}
        publiable={estPubliable(v.statut)}
        statut={LIBELLES_STATUT[v.statut]}
        prixRenseigne={annonce.prixAfficheCentimes !== null}
        nbPhotosPubliques={publiques.length}
        url={urlAnnonce(annonce.slug)}
        reference={annonce.reference}
        misAJourLe={annonce.misAJourLe}
        dejaPubliee={!!annonce.publieeLe}
        siteEnLigne={reglages.enLigne}
      />

      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
          <CardDescription>Visites de la page de l&apos;annonce et clics sur « Écrire sur WhatsApp ».</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Statistique icone={<Eye className="size-4" />} libelle="Vues" sept={stats.vues7} trente={stats.vues30} />
          <Statistique icone={<MessageCircle className="size-4" />} libelle="Clics WhatsApp" sept={stats.clics7} trente={stats.clics30} />
        </CardContent>
      </Card>

      <PhotosAnnonce vehiculeId={v.id} publiques={publiques} autres={autres} couvertureId={annonce.couvertureId} />

      <FormulaireAnnonce
        vehiculeId={v.id}
        valeurs={annonceVersSaisie(annonce)}
        caracteristiques={{
          marque: v.marque,
          modele: v.modele,
          version: v.version,
          annee: v.annee,
          kilometrage: v.kilometrageActuel ?? v.kilometrageAchat,
          carburant: v.carburant,
          boite: v.boite,
          couleur: v.couleur,
          nombrePlaces: v.nombrePlaces,
          dateMiseEnCirculation: v.dateMiseEnCirculation ? dateCalendaireVersISO(v.dateMiseEnCirculation) : null,
        }}
      />
    </div>
  );
}

function Statistique({ icone, libelle, sept, trente }: { icone: React.ReactNode; libelle: string; sept: number; trente: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icone} {libelle}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{formatNombre(sept)}</p>
      <p className="text-xs text-muted-foreground">7 derniers jours · {formatNombre(trente)} sur 30 jours</p>
    </div>
  );
}
