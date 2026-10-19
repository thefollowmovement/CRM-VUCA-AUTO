import { CalendarRange, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListeContrats } from "@/components/location/liste-contrats";
import { PlanningGantt } from "@/components/location/planning-gantt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ajouterJoursParis, debutJourParis } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatDate, formatEuros, formatPourcentageBp } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";
import { contratsPlanning, listerContrats, occupationVehicule } from "@/server/requetes/contrats";

export const metadata = { title: "Location" };

export default async function PageLocationVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.vehicule.findUnique({
    where: { id },
    select: {
      id: true, marque: true, modele: true, version: true, immatriculation: true, statut: true, typeExploitation: true,
      fichiers: { where: { categorie: "PHOTO_VEHICULE", estPrincipale: true }, select: { id: true }, take: 1 },
    },
  });
  if (!v) notFound();
  // Calendrier : de 7 jours avant à 5 semaines après aujourd'hui
  const debut = ajouterJoursParis(debutJourParis(new Date()), -7);
  const fin = ajouterJoursParis(debut, 42);
  const jours: Date[] = [];
  for (let j = debut; j < fin; j = ajouterJoursParis(j, 1)) jours.push(j);
  const [contrats, planning, occupation] = await Promise.all([listerContrats({ vehicule: id }), contratsPlanning(debut, fin, id), occupationVehicule(id)]);
  const louable = v.typeExploitation !== "ACHAT_REVENTE" && !["VENDU", "ARCHIVE", "IMMOBILISE"].includes(v.statut);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Taux d&apos;occupation</p>
          <p className="text-lg font-semibold tabular-nums">{formatPourcentageBp(occupation?.tauxBp)}</p>
          <p className="text-xs text-muted-foreground">depuis le {formatDate(occupation?.depuis)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Jours loués</p>
          <p className="text-lg font-semibold tabular-nums">{occupation?.joursLoues ?? 0}</p>
          <p className="text-xs text-muted-foreground">sur {occupation?.joursDisponibles ?? 0} jours disponibles</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Revenus encaissés</p>
          <p className="text-lg font-semibold tabular-nums">{formatEuros(occupation?.revenusCentimes ?? 0)}</p>
          <p className="text-xs text-muted-foreground">paiements (Phase 6)</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Contrats</p>
          <p className="text-lg font-semibold tabular-nums">{contrats.length}</p>
          <p className="text-xs text-muted-foreground">{contrats.filter((c) => ["RESERVATION", "CONFIRMEE"].includes(c.statut)).length} à venir</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="size-5 text-primary" /> Calendrier
          </CardTitle>
          {louable && (
            <Button asChild size="sm">
              <Link href={`/location/contrats/nouveau?vehicule=${id}`}>
                <Plus /> Nouvelle location
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <PlanningGantt
            vehicules={[{ id: v.id, nom: nomVehicule(v), immatriculation: v.immatriculation, photoId: v.fichiers[0]?.id ?? null, immobilise: !louable }]}
            contrats={planning}
            jours={jours}
            debut={debut}
            fin={fin}
            largeurJour={30}
            lienVehicule={false}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Contrats</h2>
        <ListeContrats contrats={contrats} afficherVehicule={false} />
      </div>
    </div>
  );
}
