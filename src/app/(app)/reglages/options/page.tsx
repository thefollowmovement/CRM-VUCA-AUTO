import type { Metadata } from "next";
import { ListeOptions } from "@/components/reglages/liste-options";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Réglages — Options de location" };

export default async function PageReglagesOptions() {
  const options = await db.optionLocation.findMany({ orderBy: [{ ordre: "asc" }, { libelle: "asc" }] });
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Options de location</h2>
      <p className="mb-4 text-sm text-muted-foreground">Proposées dans l&apos;assistant de création de contrat.</p>
      <ListeOptions options={options} />
    </>
  );
}
