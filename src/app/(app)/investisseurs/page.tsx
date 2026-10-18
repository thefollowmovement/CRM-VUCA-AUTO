import { Building, ChevronRight, HandCoins, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { DialoguePartenaire } from "@/components/partenaires/dialogue-partenaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { masquerIban } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Investisseurs" };

export default async function PageInvestisseurs({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  await exigerRolePage(ROLES_GESTION);
  const voirArchives = (await searchParams).archives === "1";

  const partenaires = await db.partenaire.findMany({
    where: { actif: !voirArchives },
    // VUCA AUTO (société) en premier, puis ordre alphabétique.
    orderBy: [{ type: "desc" }, { nom: "asc" }],
  });

  return (
    <>
      <EnTetePage
        titre="Investisseurs"
        description="VUCA AUTO et les personnes qui financent les véhicules. Capital engagé, bénéfices et reste dû arrivent en Phases 3 et 7."
        actions={
          <DialoguePartenaire
            declencheur={
              <Button>
                <Plus /> Nouvel investisseur
              </Button>
            }
          />
        }
      />

      <div className="mb-4 flex gap-2 text-sm">
        {[
          { libelle: "Actifs", href: "/investisseurs", actif: !voirArchives },
          { libelle: "Archivés", href: "/investisseurs?archives=1", actif: voirArchives },
        ].map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={cn(
              "rounded-full border px-3 py-1.5",
              f.actif ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground",
            )}
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      {partenaires.length === 0 ? (
        <EtatVide
          icone={HandCoins}
          titre={voirArchives ? "Aucun partenaire archivé" : "Aucun investisseur"}
          description={voirArchives ? undefined : "Ajoutez les personnes qui financent vos véhicules."}
        />
      ) : (
        <>
          {/* Téléphone : cartes */}
          <div className="flex flex-col gap-2 md:hidden">
            {partenaires.map((p) => (
              <Link key={p.id} href={`/investisseurs/${p.id}`}>
                <Card className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {p.nom}
                      {p.type === "SOCIETE" && <Badge>Société</Badge>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[p.telephone, p.email].filter(Boolean).join(" · ") || "Aucun contact"}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>

          {/* Ordinateur : tableau */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {partenaires.map((p) => (
                  <TableRow key={p.id} className="relative">
                    <TableCell className="font-medium">
                      <Link href={`/investisseurs/${p.id}`} className="flex items-center gap-2 after:absolute after:inset-0">
                        {p.type === "SOCIETE" && <Building className="size-4 text-primary" />}
                        {p.nom}
                      </Link>
                    </TableCell>
                    <TableCell>{p.telephone ?? "—"}</TableCell>
                    <TableCell>{p.email ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{masquerIban(p.iban)}</TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
