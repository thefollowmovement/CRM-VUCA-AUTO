import { CircleAlert, CircleCheck, CircleDashed, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListeDepenses } from "@/components/depenses/liste-depenses";
import { Button } from "@/components/ui/button";
import { DialogueEcheances } from "@/components/vehicules/dialogue-echeances";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { etatEcheanceDate, etatEcheanceKm, plusUrgent, type EtatEcheance } from "@/lib/calculs/echeances";
import { db } from "@/lib/db";
import { dateCalendaireVersISO, formatDate, formatDateHeure, formatNombre } from "@/lib/format";
import { lireReglages } from "@/lib/reglages";
import { cn } from "@/lib/utils";
import { listerDepenses } from "@/server/requetes/depenses";

// Catégories de dépenses considérées comme entretien / réparation
const CATEGORIES_ENTRETIEN = ["ENTRETIEN", "MECANIQUE", "PNEUS", "CONTROLE_TECHNIQUE", "PIECES", "CARROSSERIE"];

export const metadata = { title: "Entretien et échéances" };

const STYLE: Record<EtatEcheance["niveau"], { icone: typeof CircleCheck; classe: string }> = {
  depassee: { icone: CircleAlert, classe: "text-destructive" },
  proche: { icone: Clock, classe: "text-amber-600 dark:text-amber-400" },
  ok: { icone: CircleCheck, classe: "text-success" },
  inconnue: { icone: CircleDashed, classe: "text-muted-foreground" },
};

function Ligne({ titre, detail, etat }: { titre: string; detail: string; etat: EtatEcheance }) {
  const { icone: Icone, classe } = STYLE[etat.niveau];
  return (
    <li className="flex items-center gap-3 py-3">
      <Icone className={cn("size-5 shrink-0", classe)} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{titre}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <span className={cn("text-right text-sm font-medium", classe)}>{etat.texte}</span>
    </li>
  );
}

export default async function PageEntretien({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [v, reglages] = await Promise.all([db.vehicule.findUnique({ where: { id } }), lireReglages()]);
  if (!v) notFound();
  const auj = new Date();
  const seuilJ = reglages.joursAvantEcheanceAlerte;
  const seuilKm = reglages.kmAvantVidangeAlerte;
  const n = (x: number | null) => (x === null ? "" : String(x));

  const vidange = plusUrgent(
    etatEcheanceDate(v.dateProchaineVidange, auj, seuilJ),
    etatEcheanceKm(v.kmProchaineVidange, v.kilometrageActuel, seuilKm),
  );
  const revision = plusUrgent(
    etatEcheanceDate(v.dateProchaineRevision, auj, seuilJ),
    etatEcheanceKm(v.kmProchaineRevision, v.kilometrageActuel, seuilKm),
  );
  const dateKm = (date: Date | null, km: number | null) =>
    [date && `le ${formatDate(date)}`, km !== null && `à ${formatNombre(km)} km`].filter(Boolean).join(" ou ") || "Non renseignée";

  // Historique : dépenses d'entretien / réparation du véhicule
  const depenses = await listerDepenses({ vehicule: id });
  const entretiens = {
    ...depenses,
    lignes: depenses.lignes.filter((d) => d.categorie.code && CATEGORIES_ENTRETIEN.includes(d.categorie.code)),
  };
  const retour = `/vehicules/${id}/entretien`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Entretien et échéances</CardTitle>
            <CardDescription>
              Kilométrage actuel : {v.kilometrageActuel !== null ? `${formatNombre(v.kilometrageActuel)} km` : "inconnu"}
              {v.kilometrageActuelLe && ` (relevé le ${formatDateHeure(v.kilometrageActuelLe)})`} · Alerte {seuilJ} jours /{" "}
              {formatNombre(seuilKm)} km avant.
            </CardDescription>
          </div>
          {v.statut !== "ARCHIVE" && (
            <DialogueEcheances
              vehiculeId={id}
              valeurs={{
                kilometrageActuel: n(v.kilometrageActuel),
                dateProchainControleTechnique: dateCalendaireVersISO(v.dateProchainControleTechnique),
                assureur: v.assureur ?? "",
                numeroPoliceAssurance: v.numeroPoliceAssurance ?? "",
                dateEcheanceAssurance: dateCalendaireVersISO(v.dateEcheanceAssurance),
                dateProchaineVidange: dateCalendaireVersISO(v.dateProchaineVidange),
                kmProchaineVidange: n(v.kmProchaineVidange),
                dateProchaineRevision: dateCalendaireVersISO(v.dateProchaineRevision),
                kmProchaineRevision: n(v.kmProchaineRevision),
              }}
            />
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            <Ligne
              titre="Contrôle technique"
              detail={v.dateProchainControleTechnique ? `Le ${formatDate(v.dateProchainControleTechnique)}` : "Non renseigné"}
              etat={etatEcheanceDate(v.dateProchainControleTechnique, auj, seuilJ)}
            />
            <Ligne
              titre="Assurance"
              detail={
                [
                  v.assureur,
                  v.numeroPoliceAssurance && `police ${v.numeroPoliceAssurance}`,
                  v.dateEcheanceAssurance && `échéance le ${formatDate(v.dateEcheanceAssurance)}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Non renseignée"
              }
              etat={etatEcheanceDate(v.dateEcheanceAssurance, auj, seuilJ)}
            />
            <Ligne titre="Vidange" detail={dateKm(v.dateProchaineVidange, v.kmProchaineVidange)} etat={vidange} />
            <Ligne titre="Révision" detail={dateKm(v.dateProchaineRevision, v.kmProchaineRevision)} etat={revision} />
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Entretiens et réparations réalisés</h2>
          {v.statut !== "ARCHIVE" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/depenses/nouvelle?vehicule=${id}&retour=${encodeURIComponent(retour)}`}>
                <Plus /> Ajouter
              </Link>
            </Button>
          )}
        </div>
        {entretiens.lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun entretien enregistré (vidange, mécanique, pneus, contrôle technique, pièces, carrosserie).
          </p>
        ) : (
          <ListeDepenses resultat={entretiens} retour={retour} afficherVehicule={false} />
        )}
      </div>
    </div>
  );
}
