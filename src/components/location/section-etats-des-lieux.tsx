// Fiche contrat : départ et retour (boutons d'assistant + résumés des états des lieux signés).
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateHeure, formatNombre } from "@/lib/format";
import { LIBELLES_PROPRETE } from "@/lib/validations/etat-des-lieux";
import type { obtenirContrat } from "@/server/requetes/contrats";

type Contrat = NonNullable<Awaited<ReturnType<typeof obtenirContrat>>>;
type Edl = Contrat["etatsDesLieux"][number];

function Resume({ edl, contratId, libelle }: { edl: Edl; contratId: string; libelle: string }) {
  const niveau = edl.niveauCarburantHuitiemes !== null ? `carburant ${edl.niveauCarburantHuitiemes}/8` : edl.niveauBatteriePct !== null ? `batterie ${edl.niveauBatteriePct} %` : null;
  return (
    <Link href={`/location/contrats/${contratId}/etat-des-lieux/${edl.type === "DEPART" ? "depart" : "retour"}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
      {edl.type === "DEPART" ? <ArrowUpFromLine className="size-5 shrink-0 text-blue-600" /> : <ArrowDownToLine className="size-5 shrink-0 text-emerald-600" />}
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">
          {libelle} · {formatDateHeure(edl.signeLe)}
        </span>
        <span className="block text-muted-foreground">
          {[`${formatNombre(edl.kilometrage)} km`, niveau, edl.propreteInterieure && `intérieur ${LIBELLES_PROPRETE[edl.propreteInterieure].toLowerCase()}`, `${edl._count.photos - 2} photos`]
            .filter(Boolean)
            .join(" · ")}
          {edl._count.dommagesConstates > 0 && <span className="text-destructive"> · {edl._count.dommagesConstates} nouveau(x) dommage(s)</span>}
        </span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function SectionEtatsDesLieux({ contrat: c }: { contrat: Contrat }) {
  const depart = c.etatsDesLieux.find((e) => e.type === "DEPART" && e.verrouille);
  const retour = c.etatsDesLieux.find((e) => e.type === "RETOUR" && e.verrouille);
  const brouillon = c.etatsDesLieux.find((e) => !e.verrouille);
  const peutPartir = (c.statut === "RESERVATION" || c.statut === "CONFIRMEE") && !c.archiveLe;
  const peutRevenir = c.statut === "EN_COURS";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-primary" /> Départ et retour
        </CardTitle>
        <CardDescription>États des lieux sur téléphone : compteur, propreté, équipements, dommages, photos, signatures.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {depart && <Resume edl={depart} contratId={c.id} libelle="Départ" />}
        {retour && <Resume edl={retour} contratId={c.id} libelle="Retour" />}
        {depart && retour && (
          <p className="text-sm">
            Parcourus : <strong>{formatNombre(retour.kilometrage - depart.kilometrage)} km</strong>
          </p>
        )}
        {peutPartir && (
          <Button asChild size="lg" className="self-start">
            <Link href={`/location/contrats/${c.id}/depart`}>
              <ArrowUpFromLine /> {brouillon?.type === "DEPART" ? "Reprendre le départ" : "Faire le départ"}
            </Link>
          </Button>
        )}
        {peutRevenir && (
          <Button asChild size="lg" className="self-start">
            <Link href={`/location/contrats/${c.id}/retour`}>
              <ArrowDownToLine /> {brouillon?.type === "RETOUR" ? "Reprendre le retour" : "Faire le retour"}
            </Link>
          </Button>
        )}
        {c.statut === "ANNULEE" && <p className="text-sm text-muted-foreground">Location annulée.</p>}
      </CardContent>
    </Card>
  );
}
