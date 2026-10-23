import { ClipboardCheck, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OngletsAmendes } from "@/components/amendes/onglets-amendes";
import { ValidationAmendes } from "@/components/amendes/validation-amendes";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { jourParisISO } from "@/lib/dates";
import { amendesAValider, compteursAmendes } from "@/server/requetes/amendes-import";

export const metadata: Metadata = { title: "PV à valider" };

export default async function PageAmendesAValider() {
  const [{ lignes, cleApi }, compteurs] = await Promise.all([amendesAValider(), compteursAmendes()]);
  return (
    <>
      <EnTetePage
        titre="PV à valider"
        description="Vérifiez chaque avis à côté de son scan : les lignes sans alerte sont déjà cochées. Les PV validés passent « à désigner »."
      />
      <OngletsAmendes aValider={compteurs.aValider} aLire={compteurs.aLire} />
      {compteurs.aLire > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          {cleApi ? null : <KeyRound className="mt-0.5 size-4 shrink-0" />}
          {compteurs.aLire} avis encore en cours de lecture{cleApi ? "" : " (clé API Anthropic non configurée)"} : ils apparaîtront ici une fois lus.
        </p>
      )}
      {lignes.length === 0 ? (
        <EtatVide
          icone={ClipboardCheck}
          titre="Aucun PV à valider"
          description="Les avis importés apparaissent ici une fois lus."
          action={
            <Link href="/location/amendes/importer" className="text-sm font-medium text-primary underline">
              Importer des avis
            </Link>
          }
        />
      ) : (
        <ValidationAmendes lignes={lignes} aujourdhuiISO={jourParisISO(new Date())} />
      )}
    </>
  );
}
