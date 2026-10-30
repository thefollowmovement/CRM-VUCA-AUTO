// Planning des locations (vue Gantt) : une ligne par véhicule, une colonne par jour.
// Sans JavaScript côté navigateur : les cases vides et les barres sont des liens.
import Link from "next/link";
import { VignetteVehicule } from "@/components/vehicules/vignette-vehicule";
import { COULEURS_STATUT_CONTRAT, LIBELLES_STATUT_CONTRAT, statutAffiche, type StatutAffiche } from "@/lib/contrat";
import { jourParisISO, partiesParis } from "@/lib/dates";
import { formatDateHeure } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContratPlanning } from "@/server/requetes/contrats";

export type LignePlanning = { id: string; nom: string; immatriculation: string | null; photoId: string | null; immobilise: boolean };

const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export function PlanningGantt({
  vehicules,
  contrats,
  jours,
  debut,
  fin,
  largeurJour,
  lienVehicule = true,
}: {
  vehicules: LignePlanning[];
  contrats: ContratPlanning[];
  /** Minuit (Paris) de chaque jour affiché. */
  jours: Date[];
  debut: Date;
  fin: Date;
  largeurJour: number;
  lienVehicule?: boolean;
}) {
  const duree = fin.getTime() - debut.getTime();
  const aujourdhui = jourParisISO(new Date());
  const maintenant = new Date();
  const colonnes = { gridTemplateColumns: `repeat(${jours.length}, minmax(${largeurJour}px, 1fr))` };
  const position = (a: Date, b: Date) => {
    const g = Math.max(0, (a.getTime() - debut.getTime()) / duree);
    const d = Math.min(1, (b.getTime() - debut.getTime()) / duree);
    return { left: `${g * 100}%`, width: `${Math.max(0, d - g) * 100}%` };
  };
  const statuts: StatutAffiche[] = ["RESERVATION", "CONFIRMEE", "EN_COURS", "EN_RETARD", "TERMINEE"];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="grid min-w-max grid-cols-[9rem_1fr] md:grid-cols-[13rem_1fr]">
          {/* En-tête des jours */}
          <div className="sticky left-0 z-20 border-b border-r bg-card" />
          <div className="grid border-b" style={colonnes}>
            {jours.map((j) => {
              const p = partiesParis(j);
              const iso = jourParisISO(j);
              const weekEnd = [0, 6].includes(new Date(Date.UTC(p.annee, p.mois - 1, p.jour)).getUTCDay());
              return (
                <div
                  key={iso}
                  className={cn("border-l px-1 py-2 text-center text-xs", weekEnd && "bg-muted/50", iso === aujourdhui && "bg-primary/10 font-semibold text-primary")}
                >
                  <span className="block text-muted-foreground">{JOURS_COURTS[new Date(Date.UTC(p.annee, p.mois - 1, p.jour)).getUTCDay()]}</span>
                  <span className="block tabular-nums">{p.jour}</span>
                </div>
              );
            })}
          </div>

          {/* Une ligne par véhicule */}
          {vehicules.map((v) => (
            <div key={v.id} className="contents">
              <div className="sticky left-0 z-20 flex items-center gap-2 border-b border-r bg-card px-2 py-2">
                <VignetteVehicule photoId={v.photoId} alt={v.nom} className="hidden size-9 shrink-0 rounded md:flex" />
                <div className="min-w-0 text-xs">
                  {lienVehicule ? (
                    <Link href={`/vehicules/${v.id}/location`} className="block truncate font-medium hover:underline">
                      {v.nom}
                    </Link>
                  ) : (
                    <span className="block truncate font-medium">{v.nom}</span>
                  )}
                  <span className="block truncate font-mono text-muted-foreground">{v.immatriculation ?? "—"}</span>
                  {v.immobilise && <span className="block font-medium text-destructive">Immobilisé</span>}
                </div>
              </div>
              <div className="relative grid min-h-14 border-b" style={colonnes}>
                {jours.map((j) => {
                  const iso = jourParisISO(j);
                  return v.immobilise ? (
                    <div key={iso} className="border-l bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,var(--color-muted)_6px,var(--color-muted)_12px)]" />
                  ) : (
                    <Link
                      key={iso}
                      href={`/location/contrats/nouveau?vehicule=${v.id}&jour=${iso}`}
                      aria-label={`Nouvelle réservation le ${iso.split("-").reverse().join("/")}`}
                      className={cn("border-l transition-colors hover:bg-primary/10", iso === aujourdhui && "bg-primary/5")}
                    />
                  );
                })}
                {contrats
                  .filter((c) => c.vehiculeId === v.id)
                  .map((c) => {
                    const s = statutAffiche(c.statut, c.retourPrevuLe, maintenant);
                    // Location en retard : la barre s'étend jusqu'à maintenant
                    const finBarre = s === "EN_RETARD" ? maintenant : (c.retourReelLe ?? c.retourPrevuLe);
                    const nom = [c.client.prenom, c.client.nom].filter(Boolean).join(" ");
                    return (
                      <Link
                        key={c.id}
                        href={`/location/contrats/${c.id}`}
                        title={`${c.numero} · ${nom} · ${LIBELLES_STATUT_CONTRAT[s]}\n${formatDateHeure(c.departReelLe ?? c.departPrevuLe)} → ${formatDateHeure(finBarre)}`}
                        className={cn(
                          "absolute top-1/2 z-10 flex h-9 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-xs font-medium shadow-sm ring-1 ring-black/5 hover:brightness-95",
                          COULEURS_STATUT_CONTRAT[s].barre,
                        )}
                        style={position(c.departReelLe ?? c.departPrevuLe, finBarre)}
                      >
                        <span className="truncate">{nom}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
          {vehicules.length === 0 && (
            <p className="col-span-2 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun véhicule de location : passez un véhicule en « Location » ou « Mixte » dans sa fiche.
            </p>
          )}
        </div>
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {statuts.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", COULEURS_STATUT_CONTRAT[s].barre)} /> {LIBELLES_STATUT_CONTRAT[s]}
          </li>
        ))}
        <li>Touchez une case libre pour réserver ce jour-là.</li>
      </ul>
    </div>
  );
}
