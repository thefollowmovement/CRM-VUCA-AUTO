import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { BadgeContrat } from "@/components/location/badge-contrat";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statutAffiche } from "@/lib/contrat";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";
import { LIBELLES_TYPE_LOCATION } from "@/lib/validations/location";
import type { listerContrats } from "@/server/requetes/contrats";

type Ligne = Awaited<ReturnType<typeof listerContrats>>[number];

export function ListeContrats({ contrats, afficherVehicule = true, actionVide }: { contrats: Ligne[]; afficherVehicule?: boolean; actionVide?: React.ReactNode }) {
  if (contrats.length === 0) return <EtatVide icone={FileText} titre="Aucun contrat" description="Les locations apparaîtront ici." action={actionVide} />;
  const maintenant = new Date();
  const nom = (c: { nom: string; prenom: string | null }) => [c.prenom, c.nom].filter(Boolean).join(" ");
  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {contrats.map((c) => (
          <Link key={c.id} href={`/location/contrats/${c.id}`}>
            <Card className="flex flex-row items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {c.numero} <BadgeContrat statut={statutAffiche(c.statut, c.retourPrevuLe, maintenant)} />
                </p>
                <p className="truncate text-sm">
                  {nom(c.client)}
                  {afficherVehicule && ` · ${c.vehicule.immatriculation ?? nomVehicule(c.vehicule)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateHeure(c.departPrevuLe)} → {formatDateHeure(c.retourPrevuLe)}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{formatEuros(c.prixTotalCentimes)}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrat</TableHead>
              <TableHead>Client</TableHead>
              {afficherVehicule && <TableHead>Véhicule</TableHead>}
              <TableHead>Départ</TableHead>
              <TableHead>Retour</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contrats.map((c) => (
              <TableRow key={c.id} className="relative">
                <TableCell className="font-medium">
                  <Link href={`/location/contrats/${c.id}`} className="after:absolute after:inset-0">
                    {c.numero}
                  </Link>
                  <span className="block text-xs font-normal text-muted-foreground">{LIBELLES_TYPE_LOCATION[c.type]}</span>
                </TableCell>
                <TableCell>{nom(c.client)}</TableCell>
                {afficherVehicule && (
                  <TableCell>
                    <span className="block">{nomVehicule(c.vehicule)}</span>
                    {c.vehicule.immatriculation && <span className="font-mono text-xs text-muted-foreground">{c.vehicule.immatriculation}</span>}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap tabular-nums">{formatDateHeure(c.departPrevuLe)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDateHeure(c.retourPrevuLe)}</TableCell>
                <TableCell>
                  <BadgeContrat statut={statutAffiche(c.statut, c.retourPrevuLe, maintenant)} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatEuros(c.prixTotalCentimes)}</TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
