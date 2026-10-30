// Page serveur commune aux assistants de départ et de retour.
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssistantEtatDesLieux } from "@/components/etat-des-lieux/assistant-etat-des-lieux";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Card, CardContent } from "@/components/ui/card";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { nomVehicule } from "@/lib/vehicule";
import { brouillonEtatDesLieux } from "@/server/requetes/etats-des-lieux";
import { db } from "@/lib/db";

export async function PageAssistantEtatDesLieux({ contratId, type }: { contratId: string; type: "DEPART" | "RETOUR" }) {
  const u = await exigerRolePage(ROLES_GESTION);
  const donnees = await brouillonEtatDesLieux(contratId, type, u.id);
  if (!donnees) notFound();
  const { contrat, edl, depart, erreur } = donnees;
  const titre = type === "DEPART" ? "Départ" : "Retour";
  const retourLien = (
    <Link href={`/location/contrats/${contratId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> {contrat.numero}
    </Link>
  );
  if (erreur || !edl) {
    return (
      <>
        {retourLien}
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TriangleAlert className="size-5 text-amber-600" /> {erreur}
          </CardContent>
        </Card>
      </>
    );
  }
  const paiements = await db.paiement.findMany({ where: { contratId }, select: { montantCentimes: true, nature: true } });
  const encaisse = paiements.filter((x) => x.nature !== "CAUTION_RETENUE").reduce((a, x) => a + (x.nature === "REMBOURSEMENT" ? -x.montantCentimes : x.montantCentimes), 0);
  const nomCli = [contrat.client.prenom, contrat.client.nom].filter(Boolean).join(" ");
  // Check-list : au retour, on repart de celle du départ ; au départ, des éléments paramétrés
  const checklist =
    type === "RETOUR" && depart
      ? depart.checklist.map((l) => ({ elementId: l.elementId, libelle: l.libelle, present: l.present, quantite: l.quantite }))
      : donnees.elements.map((e) => ({ elementId: e.id, libelle: e.libelle, present: true, quantite: e.avecQuantite ? 1 : null }));

  return (
    <>
      {retourLien}
      <div className="mx-auto max-w-3xl">
        <EnTetePage titre={`${titre} · ${contrat.numero}`} description={`${nomVehicule(contrat.vehicule)}${contrat.vehicule.immatriculation ? ` · ${contrat.vehicule.immatriculation}` : ""} · ${nomCli}`} />
      </div>
      <AssistantEtatDesLieux
        type={type}
        edlId={edl.id}
        contrat={{
          id: contrat.id,
          numero: contrat.numero,
          vehiculeId: contrat.vehicule.id,
          nomVehicule: nomVehicule(contrat.vehicule),
          nomClient: nomCli,
          cautionCentimes: contrat.cautionCentimes,
          statutCaution: contrat.statutCaution,
          prixTotalCentimes: contrat.prixTotalCentimes,
          encaisseCentimes: encaisse,
        }}
        kmReference={type === "RETOUR" ? null : contrat.vehicule.kilometrageActuel}
        depart={depart ? { kilometrage: depart.kilometrage, niveauCarburantHuitiemes: depart.niveauCarburantHuitiemes, niveauBatteriePct: depart.niveauBatteriePct } : null}
        mesures={donnees.mesures}
        checklist={checklist}
        photos={edl.photos.filter((x) => x.categorie !== "SIGNATURE").map((x) => ({ id: x.id, categorie: x.categorie }))}
        dommages={donnees.dommages.map((d) => ({ id: d.id, vue: d.vue, zone: d.zone, positionX: d.positionX, positionY: d.positionY, type: d.type, gravite: d.gravite, nouveau: d.etatDesLieuxId === edl.id }))}
      />
    </>
  );
}
