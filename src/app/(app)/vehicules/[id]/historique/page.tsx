import { notFound } from "next/navigation";
import { BadgeStatut } from "@/components/vehicules/badge-statut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";

export const metadata = { title: "Historique" };

const LIBELLES: Record<string, string> = {
  "CREATION:Vehicule": "Création du véhicule",
  "MODIFICATION:Vehicule": "Modification des informations",
  "ARCHIVAGE:Vehicule": "Archivage",
  "RESTAURATION:Vehicule": "Restauration",
  "CREATION:PhotoVehicule": "Ajout d'une photo",
  "CREATION:DocumentVehicule": "Ajout d'un document",
  "SUPPRESSION:FichierVehicule": "Suppression d'une photo ou d'un document",
};

export default async function PageHistorique({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [statuts, journal] = await Promise.all([
    db.historiqueStatutVehicule.findMany({
      where: { vehiculeId: id },
      orderBy: { changeLe: "desc" },
      include: { utilisateur: { select: { nom: true } } },
    }),
    db.journalActivite.findMany({
      where: { entiteId: id, entite: { in: ["Vehicule", "PhotoVehicule", "DocumentVehicule", "FichierVehicule"] } },
      orderBy: { creeLe: "desc" },
      take: 100,
      include: { utilisateur: { select: { nom: true } } },
    }),
  ]);
  if (statuts.length === 0 && !(await db.vehicule.findUnique({ where: { id }, select: { id: true } }))) notFound();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Changements de statut</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-4 border-l pl-5">
            {statuts.map((s) => (
              <li key={s.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  {s.ancienStatut && (
                    <>
                      <BadgeStatut statut={s.ancienStatut} />
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <BadgeStatut statut={s.nouveauStatut} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateHeure(s.changeLe)} · {s.utilisateur?.nom ?? "Système"}
                </p>
                {s.motif && <p className="text-sm">{s.motif}</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Journal d&apos;activité</CardTitle>
        </CardHeader>
        <CardContent>
          {journal.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité.</p>
          ) : (
            <ul className="divide-y text-sm">
              {journal.map((j) => (
                <li key={j.id} className="flex flex-col py-2">
                  <span className="font-medium">{LIBELLES[`${j.action}:${j.entite}`] ?? `${j.action} ${j.entite}`}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateHeure(j.creeLe)} · {j.utilisateur?.nom ?? "Système"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
