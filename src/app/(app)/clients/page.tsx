import { ChevronRight, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgesAlertes } from "@/components/clients/alertes-client";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { RechercheUrl } from "@/components/ui/recherche-url";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { alertesClient } from "@/lib/calculs/clients";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lireReglages } from "@/lib/reglages";
import { cn } from "@/lib/utils";
import { listerClients, nomClient, type FiltreClients } from "@/server/requetes/clients";

export const metadata: Metadata = { title: "Clients" };

export default async function PageClients({ searchParams }: { searchParams: Promise<{ q?: string; filtre?: string }> }) {
  await exigerRolePage(ROLES_GESTION);
  const sp = await searchParams;
  const filtre: FiltreClients = sp.filtre === "liste-noire" || sp.filtre === "archives" || sp.filtre === "permis-expire" ? sp.filtre : "actifs";
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const [clients, reglages] = await Promise.all([listerClients(q, filtre), lireReglages()]);
  const auj = new Date();
  const lignes = clients.map((c) => ({ ...c, nomComplet: nomClient(c), alertes: c.anonymiseLe ? [] : alertesClient(c, auj, reglages.anciennetePermisMinAnnees) }));
  const lienFiltre = (f: string) => `/clients?${new URLSearchParams({ ...(q ? { q } : {}), ...(f !== "actifs" ? { filtre: f } : {}) }).toString()}`;

  return (
    <>
      <EnTetePage
        titre="Clients"
        description="Locataires et conducteurs : permis, pièces d'identité, historique des locations."
        actions={
          <Button asChild>
            <Link href="/clients/nouveau">
              <Plus /> Nouveau client
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <RechercheUrl placeholder="Nom, téléphone, email, n° de permis…" libelle="Rechercher un client" />
        <div className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ["actifs", "Actifs"],
              ["liste-noire", "Liste noire"],
              ["permis-expire", "Permis expiré"],
              ["archives", "Archivés"],
            ] as const
          ).map(([f, libelle]) => (
            <Link
              key={f}
              href={lienFiltre(f)}
              className={cn("rounded-full border px-3 py-1.5", filtre === f ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground")}
            >
              {libelle}
            </Link>
          ))}
        </div>
      </div>

      {lignes.length === 0 ? (
        <EtatVide
          icone={Users}
          titre={q ? "Aucun client trouvé" : filtre === "actifs" ? "Aucun client" : "Personne ici"}
          description={q ? "Essayez une autre recherche." : filtre === "actifs" ? "Ajoutez vos locataires : ils seront proposés à la création des contrats." : undefined}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lignes.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="flex flex-row items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.nomComplet}</p>
                    <p className="truncate text-sm text-muted-foreground">{[c.telephone, c.email].filter(Boolean).join(" · ") || "Aucun contact"}</p>
                    <div className="mt-1">
                      <BadgesAlertes alertes={c.alertes} />
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-right">Locations</TableHead>
                  <TableHead>Alertes</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((c) => (
                  <TableRow key={c.id} className="relative">
                    <TableCell className="font-medium">
                      <Link href={`/clients/${c.id}`} className="after:absolute after:inset-0">
                        {c.nomComplet}
                      </Link>
                      {c.entreprise && <span className="block text-xs font-normal text-muted-foreground">{c.entreprise}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{c.telephone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.ville ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c._count.contrats}</TableCell>
                    <TableCell>
                      <BadgesAlertes alertes={c.alertes} />
                    </TableCell>
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
