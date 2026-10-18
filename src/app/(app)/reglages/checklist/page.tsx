import type { Metadata } from "next";
import { ListeChecklist } from "@/components/reglages/liste-checklist";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Réglages — Check-list" };

export default async function PageReglagesChecklist() {
  const elements = await db.elementChecklist.findMany({ orderBy: [{ ordre: "asc" }, { libelle: "asc" }] });
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Check-list de l&apos;état des lieux</h2>
      <p className="mb-4 text-sm text-muted-foreground">Équipements vérifiés au départ et au retour de chaque location.</p>
      <ListeChecklist elements={elements} />
    </>
  );
}
