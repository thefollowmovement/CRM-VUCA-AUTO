import { Car, Download, LayoutGrid, List, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { FiltresVehicules } from "@/components/vehicules/filtres-vehicules";
import { CartesVehicules, TableauVehicules } from "@/components/vehicules/liste-vehicules";
import { Button } from "@/components/ui/button";
import { EtatVide } from "@/components/ui/etat-vide";
import { formatDate } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { lireFiltres, listerVehicules, optionsFiltres } from "@/server/requetes/vehicules";

export const metadata: Metadata = { title: "Véhicules" };

const ETATS = [
  { valeur: "stock", libelle: "En stock" },
  { valeur: "vendus", libelle: "Vendus" },
  { valeur: "archives", libelle: "Archivés" },
  { valeur: "tous", libelle: "Tous" },
] as const;

const LIBELLES_ALERTE = {
  stock: "en stock depuis longtemps",
  ct: "CT ou assurance à renouveler",
  entretien: "vidange ou révision proche",
  financement: "participations différentes du prix d'achat",
} as const;

export default async function PageVehicules({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigerRolePage(ROLES_GESTION);
  const brut = await searchParams;
  const filtres = lireFiltres(brut);
  const params = new URLSearchParams(
    Object.entries(brut).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  const [lignes, options] = await Promise.all([listerVehicules(filtres), optionsFiltres()]);
  const affichage = params.get("affichage"); // null = automatique (cartes sur téléphone, tableau sur ordinateur)

  const lien = (modifs: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(modifs)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `?${p.toString()}`;
  };

  return (
    <>
      <EnTetePage
        titre="Véhicules"
        description={`${lignes.length} véhicule${lignes.length > 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/export/vehicules?${params.toString()}`}>
                <Download /> Export CSV
              </a>
            </Button>
            <Button asChild>
              <Link href="/vehicules/nouveau">
                <Plus /> Nouveau véhicule
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {ETATS.map((e) => (
            <Link
              key={e.valeur}
              href={lien({ etat: e.valeur === "stock" ? null : e.valeur })}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                filtres.etat === e.valeur ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {e.libelle}
            </Link>
          ))}
        </div>
        <div className="hidden gap-1 md:flex">
          <Button variant={affichage === "cartes" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href={lien({ affichage: "cartes" })} scroll={false} aria-label="Affichage en cartes">
              <LayoutGrid /> Cartes
            </Link>
          </Button>
          <Button variant={affichage !== "cartes" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href={lien({ affichage: null })} scroll={false} aria-label="Affichage en tableau">
              <List /> Tableau
            </Link>
          </Button>
        </div>
      </div>

      {(filtres.alerte || filtres.venteDu || filtres.venteAu) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">
            {filtres.alerte ? `Alerte : ${LIBELLES_ALERTE[filtres.alerte]}` : `Vendus du ${formatDate(filtres.venteDu)} au ${formatDate(filtres.venteAu)}`}
          </span>
          <Link href={lien({ alerte: null, venteDu: null, venteAu: null })} scroll={false} className="font-medium text-primary hover:underline">
            Retirer ce filtre
          </Link>
        </div>
      )}

      <div className="mb-4">
        <FiltresVehicules marques={options.marques} financeurs={options.financeurs} />
      </div>

      {lignes.length === 0 ? (
        <EtatVide
          icone={Car}
          titre={filtres.q || params.size > 0 ? "Aucun véhicule ne correspond" : "Aucun véhicule pour l'instant"}
          description="Ajoutez votre premier véhicule : identité, achat et financement."
          action={
            <Button asChild>
              <Link href="/vehicules/nouveau">
                <Plus /> Nouveau véhicule
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className={cn(affichage === "cartes" ? "block" : "md:hidden")}>
            <CartesVehicules lignes={lignes} />
          </div>
          {affichage !== "cartes" && (
            <div className="hidden md:block">
              <TableauVehicules lignes={lignes} filtres={filtres} params={params} />
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">* Marge prévisionnelle (prix cible, sinon valeur estimée) pour les véhicules non vendus.</p>
        </>
      )}
    </>
  );
}
