import { notFound, redirect } from "next/navigation";
import { FormulaireVente } from "@/components/finance/formulaire-vente";
import { centimesVersSaisie, aujourdhuiISO } from "@/lib/format";
import { db } from "@/lib/db";
import { bilanVehicule } from "@/server/requetes/rentabilite";

export const metadata = { title: "Marquer comme vendu" };

export default async function PageVendre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.vehicule.findUnique({ where: { id }, select: { statut: true, prixCibleCentimes: true, kilometrageActuel: true } });
  if (!v) notFound();
  if (v.statut === "VENDU" || v.statut === "ARCHIVE") redirect(`/vehicules/${id}`);
  const bilan = await bilanVehicule(id);
  if (!bilan) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Marquer comme vendu</h2>
      <FormulaireVente
        vehiculeId={id}
        valeurs={{
          prixVente: centimesVersSaisie(v.prixCibleCentimes),
          dateVente: aujourdhuiISO(),
          kilometrageVente: v.kilometrageActuel === null ? "" : String(v.kilometrageActuel),
          acheteurNom: "",
          acheteurTelephone: "",
          acheteurEmail: "",
          acheteurAdresse: "",
          modePaiementVente: "",
          notesVente: "",
        }}
        entree={bilan.entree}
        investissements={bilan.investissements}
        parametres={bilan.parametres}
        noms={bilan.noms}
      />
    </div>
  );
}
