import { notFound } from "next/navigation";
import { DocumentsVehicule } from "@/components/vehicules/documents-vehicule";
import { db } from "@/lib/db";
import { CATEGORIES_DOCUMENTS_VEHICULE } from "@/lib/validations/vehicule";

export const metadata = { title: "Documents" };

export default async function PageDocumentsVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.vehicule.findUnique({
    where: { id },
    select: {
      statut: true,
      fichiers: {
        where: { categorie: { in: [...CATEGORIES_DOCUMENTS_VEHICULE] } },
        orderBy: { creeLe: "desc" },
        select: { id: true, categorie: true, libelle: true, nomOriginal: true, typeMime: true, tailleOctets: true, creeLe: true },
      },
    },
  });
  if (!v) notFound();
  return (
    <DocumentsVehicule
      vehiculeId={id}
      modifiable={v.statut !== "ARCHIVE"}
      documents={v.fichiers.map((f) => ({ ...f, categorie: f.categorie as (typeof CATEGORIES_DOCUMENTS_VEHICULE)[number] }))}
    />
  );
}
