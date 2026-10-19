import { notFound } from "next/navigation";
import { DommagesVehicule } from "@/components/etat-des-lieux/dommages-vehicule";
import { db } from "@/lib/db";
import { dommagesVehicule } from "@/server/requetes/etats-des-lieux";

export const metadata = { title: "Dommages" };

export default async function PageDommagesVehicule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await db.vehicule.findUnique({ where: { id }, select: { id: true, statut: true } });
  if (!v) notFound();
  const { actuels, repares } = await dommagesVehicule(id);
  return <DommagesVehicule vehiculeId={id} actuels={actuels} repares={repares} modifiable={v.statut !== "ARCHIVE"} />;
}
