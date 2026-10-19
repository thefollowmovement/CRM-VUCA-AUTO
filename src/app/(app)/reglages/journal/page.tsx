import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatDateHeure } from "@/lib/format";

export const metadata: Metadata = { title: "Réglages — Journal d'activité" };

const PAR_PAGE = 50;

const LIBELLES_ACTIONS: Record<string, { libelle: string; variante: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  CREATION: { libelle: "Création", variante: "success" },
  MODIFICATION: { libelle: "Modification", variante: "default" },
  SUPPRESSION: { libelle: "Suppression", variante: "destructive" },
  ARCHIVAGE: { libelle: "Archivage", variante: "warning" },
  RESTAURATION: { libelle: "Réactivation", variante: "secondary" },
  CONNEXION: { libelle: "Connexion", variante: "secondary" },
  MOT_DE_PASSE: { libelle: "Mot de passe", variante: "secondary" },
  ANONYMISATION: { libelle: "Anonymisation", variante: "warning" },
};

export default async function PageJournal({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [entrees, total] = await Promise.all([
    db.journalActivite.findMany({
      orderBy: { creeLe: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      include: { utilisateur: { select: { nom: true } } },
    }),
    db.journalActivite.count(),
  ]);
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Journal d&apos;activité</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Toutes les créations, modifications et suppressions, avec leur auteur. {total} entrée(s).
      </p>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Élément</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entrees.map((e) => {
              const action = LIBELLES_ACTIONS[e.action] ?? { libelle: e.action, variante: "secondary" as const };
              return (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateHeure(e.creeLe)}</TableCell>
                  <TableCell>{e.utilisateur?.nom ?? "Système"}</TableCell>
                  <TableCell>
                    <Badge variant={action.variante}>{action.libelle}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.entite}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      {nbPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" asChild disabled={page <= 1}>
            <Link href={`?page=${Math.max(1, page - 1)}`} aria-disabled={page <= 1}>
              Précédent
            </Link>
          </Button>
          <span className="text-muted-foreground">
            Page {page} / {nbPages}
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`?page=${Math.min(nbPages, page + 1)}`} aria-disabled={page >= nbPages}>
              Suivant
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
