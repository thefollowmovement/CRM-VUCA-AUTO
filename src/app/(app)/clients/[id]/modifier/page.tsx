import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormulaireClient } from "@/components/clients/formulaire-client";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { clientVersSaisie } from "@/lib/client-formulaire";
import { db } from "@/lib/db";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { nomClient } from "@/server/requetes/clients";

export const metadata: Metadata = { title: "Modifier le client" };

export default async function PageModifierClient({ params }: { params: Promise<{ id: string }> }) {
  await exigerRolePage(ROLES_GESTION);
  const { id } = await params;
  const c = await db.client.findUnique({ where: { id } });
  if (!c) notFound();
  if (c.anonymiseLe) redirect(`/clients/${id}`);
  return (
    <>
      <Link href={`/clients/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {nomClient(c)}
      </Link>
      <div className="mx-auto max-w-3xl">
        <EnTetePage titre="Modifier le client" />
      </div>
      <FormulaireClient clientId={id} valeurs={clientVersSaisie(c)} />
    </>
  );
}
