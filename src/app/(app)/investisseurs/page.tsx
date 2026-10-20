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
import { formatEuros } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { resumesPartenaires, type ResumePartenaire } from "@/server/requetes/rentabilite";

export const metadata: Metadata = { title: "Investisseurs" };

export default async function PageInvestisseurs({ searchParams }: { searchParams: Promise<{ archives?: string }> }) {
  await exigerRolePage(ROLES_GESTION);
  const voirArchives = (await searchParams).archives === "1";

  const [partenaires, resumes] = await Promise.all([
    db.partenaire.findMany({
      where: { actif: !voirArchives },
      // VUCA AUTO (société) en premier, puis ordre alphabétique.
      orderBy: [{ type: "asc" }, { nom: "asc" }],
    }),
    resumesPartenaires(),
  ]);
  const vide: ResumePartenaire = {
    capitalEngageCentimes: 0,
    vehiculesEnCours: 0,
    beneficesRealisesCentimes: 0,
    beneficesPrevisionnelsCentimes: 0,
    verseCentimes: 0,
    resteDuCentimes: 0,
  };

  return (
    <>
      <EnTetePage
        titre="Investisseurs"
        description="VUCA AUTO et les personnes qui financent les véhicules. Capital engagé = achat + dépenses sur les véhicules pas encore vendus."
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
                      {formatEuros((resumes.get(p.id) ?? vide).capitalEngageCentimes)} engagés ·{" "}
                      {(resumes.get(p.id) ?? vide).vehiculesEnCours} véhicule
                      {(resumes.get(p.id) ?? vide).vehiculesEnCours > 1 ? "s" : ""}
                    </p>
                    {p.type !== "SOCIETE" && (resumes.get(p.id) ?? vide).resteDuCentimes !== 0 && (
                      <p className="text-sm font-medium">Reste dû : {formatEuros((resumes.get(p.id) ?? vide).resteDuCentimes)}</p>
                    )}
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
                  <TableHead className="text-right">Capital engagé</TableHead>
                  <TableHead className="text-right">Véhicules en cours</TableHead>
                  <TableHead className="text-right">Bénéfices réalisés</TableHead>
                  <TableHead className="text-right">Déjà versé</TableHead>
                  <TableHead className="text-right">Reste dû</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {partenaires.map((p) => {
                  const r = resumes.get(p.id) ?? vide;
                  return (
                    <TableRow key={p.id} className="relative">
                      <TableCell className="font-medium">
                        <Link href={`/investisseurs/${p.id}`} className="flex items-center gap-2 after:absolute after:inset-0">
                          {p.type === "SOCIETE" && <Building className="size-4 text-primary" />}
                          {p.nom}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatEuros(r.capitalEngageCentimes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.vehiculesEnCours}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", r.beneficesRealisesCentimes < 0 && "text-destructive")}>
                        {formatEuros(r.beneficesRealisesCentimes)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.type === "SOCIETE" ? "—" : formatEuros(r.verseCentimes)}</TableCell>
                      {/* VUCA AUTO garde l'argent des ventes : pas de « reste dû » envers elle-même */}
                      <TableCell className="text-right font-semibold tabular-nums">{p.type === "SOCIETE" ? "—" : formatEuros(r.resteDuCentimes)}</TableCell>
                      <TableCell>{p.telephone ?? "—"}</TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
