"use client";

import { CircleCheck, Trash, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirmation } from "@/components/ui/confirmation";
import { formatDate } from "@/lib/format";
import { COULEURS_GRAVITE, LIBELLES_GRAVITE } from "@/lib/schema-vehicule";
import { marquerDommageRepare, supprimerDommage } from "@/server/actions/etats-des-lieux";
import type { DommageAffiche } from "@/server/requetes/etats-des-lieux";
import { DialogueDommage, type PointTouche } from "./dialogue-dommage";
import { SchemaVehicule } from "./schema-vehicule";

function Ligne({ d, actions }: { d: DommageAffiche; actions: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: COULEURS_GRAVITE[d.gravite] }}>
        {d.numero}
      </span>
      {d.photoIds[0] && (
        <a href={`/api/fichiers/${d.photoIds[0]}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/fichiers/${d.photoIds[0]}?taille=mini`} alt="" className="size-10 rounded object-cover" />
        </a>
      )}
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">{d.libelle}</span>
        <span className="block text-xs text-muted-foreground">
          {LIBELLES_GRAVITE[d.gravite]} · constaté le {formatDate(d.constateLe)}
          {d.contrat && (
            <>
              {" "}
              au {d.contrat.type === "DEPART" ? "départ" : "retour"} de{" "}
              <Link href={`/location/contrats/${d.contrat.id}`} className="underline">
                {d.contrat.numero}
              </Link>
            </>
          )}
          {d.repareLe && ` · réparé le ${formatDate(d.repareLe)}`}
        </span>
        {d.description && <span className="block text-xs">{d.description}</span>}
      </span>
      <span className="flex shrink-0 gap-1">{actions}</span>
    </li>
  );
}

/** Onglet Dommages : schéma des dommages actuels, ajout hors état des lieux, réparation. */
export function DommagesVehicule({ vehiculeId, actuels, repares, modifiable }: { vehiculeId: string; actuels: DommageAffiche[]; repares: DommageAffiche[]; modifiable: boolean }) {
  const router = useRouter();
  const [point, setPoint] = useState<PointTouche | null>(null);
  const reparer = async (id: string, repare: boolean) => {
    if (traiterResultat(await marquerDommageRepare(id, repare))) router.refresh();
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dommages actuels ({actuels.length})</CardTitle>
          <CardDescription>Ils sont reportés automatiquement à chaque état des lieux, jusqu&apos;à leur réparation.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaVehicule dommages={actuels} onToucher={modifiable ? (vue, zone, x, y) => setPoint({ vue, zone, x, y }) : undefined} />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Liste</CardTitle>
          </CardHeader>
          <CardContent>
            {actuels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dommage connu. {modifiable && "Touchez le schéma pour en signaler un (ex. constaté à l'achat)."}</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {actuels.map((d) => (
                  <Ligne
                    key={d.id}
                    d={d}
                    actions={
                      modifiable && (
                        <>
                          <Confirmation titre="Marquer ce dommage comme réparé ?" description="Il n'apparaîtra plus sur les prochains états des lieux." libelleConfirmer="Réparé" destructif={false} onConfirmer={() => reparer(d.id, true)}>
                            <Button variant="outline" size="sm">
                              <CircleCheck /> Réparé
                            </Button>
                          </Confirmation>
                          {d.supprimable && (
                            <Confirmation
                              titre="Supprimer ce dommage ?"
                              libelleConfirmer="Supprimer"
                              onConfirmer={async () => {
                                if (traiterResultat(await supprimerDommage(d.id))) router.refresh();
                              }}
                            >
                              <Button variant="ghost" size="icon" className="text-destructive" aria-label="Supprimer le dommage">
                                <Trash />
                              </Button>
                            </Confirmation>
                          )}
                        </>
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        {repares.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historique (réparés)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {repares.map((d) => (
                  <Ligne
                    key={d.id}
                    d={d}
                    actions={
                      modifiable && (
                        <Button variant="ghost" size="icon" aria-label="Annuler la réparation" onClick={() => reparer(d.id, false)}>
                          <Undo2 />
                        </Button>
                      )
                    }
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
      {point && <DialogueDommage point={point} vehiculeId={vehiculeId} etatDesLieuxId={null} onFermer={() => setPoint(null)} onAjoute={() => router.refresh()} />}
    </div>
  );
}
