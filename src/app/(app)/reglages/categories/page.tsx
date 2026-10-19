import type { Metadata } from "next";
import { ListeCategories } from "@/components/reglages/liste-categories";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Réglages — Catégories de dépenses" };

export default async function PageReglagesCategories() {
  const categories = await db.categorieDepense.findMany({
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    include: { _count: { select: { depenses: true } } },
  });
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Catégories de dépenses</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Une catégorie déjà utilisée ne peut pas être supprimée : désactivez-la pour ne plus la proposer.
      </p>
      <ListeCategories
        categories={categories.map(({ _count, ...c }) => ({ ...c, nbDepenses: _count.depenses }))}
      />
    </>
  );
}
