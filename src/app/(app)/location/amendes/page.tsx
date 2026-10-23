import { BadgeAlert, ChevronRight, Download, Plus, Upload, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OngletsAmendes } from "@/components/amendes/onglets-amendes";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EtatVide } from "@/components/ui/etat-vide";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { formatDate, formatDateHeure, formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LIBELLES_STATUT_AMENDE, STATUTS_AMENDE, VARIANTE_STATUT_AMENDE } from "@/lib/validations/paiement";
import { compteursAmendes } from "@/server/requetes/amendes-import";
import { choixFiltresAmendes, listerAmendes, type FiltresAmendes } from "@/server/requetes/amendes-sinistres";

export const metadata: Metadata = { title: "PV" };

type Recherche = Record<string, string | undefined>;
const ID = /^c[a-z0-9]{20,}$/;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

function lireFiltres(sp: Recherche): FiltresAmendes {
  return {
    statut: (STATUTS_AMENDE as readonly string[]).includes(sp.statut ?? "") ? sp.statut : undefined,
    clientId: ID.test(sp.client ?? "") ? sp.client : undefined,
    vehiculeId: ID.test(sp.vehicule ?? "") ? sp.vehicule : undefined,
    contratId: ID.test(sp.contrat ?? "") ? sp.contrat : undefined,
    du: JOUR.test(sp.du ?? "") ? sp.du : undefined,
    au: JOUR.test(sp.au ?? "") ? sp.au : undefined,
    echeance: sp.echeance === "proche" || sp.echeance === "depassee" ? sp.echeance : undefined,
  };
}

export default async function PageAmendes({ searchParams }: { searchParams: Promise<Recherche> }) {
  const sp = await searchParams;
  const f = lireFiltres(sp);
  const [amendes, compteurs, choix] = await Promise.all([listerAmendes(f), compteursAmendes(), choixFiltresAmendes()]);
  const actifs = Object.values(f).some(Boolean);
  const contrat = f.contratId ? amendes.find((a) => a.contrat?.id === f.contratId)?.contrat : null;
  const lienStatut = (s: string) => {
    const q = new URLSearchParams(Object.entries({ ...sp, statut: s }).filter((e): e is [string, string] => !!e[1]));
    return `/location/amendes${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <EnTetePage
        titre="PV et amendes"
        description="Le conducteur est retrouvé automatiquement d'après le véhicule et l'heure de l'infraction. Le délai pour le désigner est de 45 jours après la date de l'avis."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/location/amendes/importer">
                <Upload /> Importer des avis
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/location/amendes/nouvelle">
                <Plus /> Saisir un PV
              </Link>
            </Button>
          </div>
        }
      />
      <OngletsAmendes aValider={compteurs.aValider} aLire={compteurs.aLire} />

      {/* Raccourcis de statut */}
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {[["", "Tous"], ...STATUTS_AMENDE.map((s) => [s, LIBELLES_STATUT_AMENDE[s]])].map(([v, l]) => (
          <Link
            key={v}
            href={lienStatut(v!)}
            className={cn("rounded-full border px-3 py-1.5", (f.statut ?? "") === v ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground")}
          >
            {l}
          </Link>
        ))}
      </div>

      {/* Filtres détaillés (formulaire GET : fonctionne aussi sans JavaScript) */}
      <form method="get" className="mb-4 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        {f.statut && <input type="hidden" name="statut" value={f.statut} />}
        {f.contratId && <input type="hidden" name="contrat" value={f.contratId} />}
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtre-vehicule">Véhicule</Label>
          <SelectNatif id="filtre-vehicule" name="vehicule" defaultValue={f.vehiculeId ?? ""}>
            <option value="">Tous</option>
            {choix.vehicules.map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </SelectNatif>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtre-client">Client</Label>
          <SelectNatif id="filtre-client" name="client" defaultValue={f.clientId ?? ""}>
            <option value="">Tous</option>
            {choix.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </SelectNatif>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtre-echeance">Échéance</Label>
          <SelectNatif id="filtre-echeance" name="echeance" defaultValue={f.echeance ?? ""}>
            <option value="">Toutes</option>
            <option value="proche">Moins de 10 jours</option>
            <option value="depassee">Dépassée</option>
          </SelectNatif>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtre-du">Infraction du</Label>
          <Input id="filtre-du" name="du" type="date" defaultValue={f.du ?? ""} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="filtre-au">au</Label>
          <Input id="filtre-au" name="au" type="date" defaultValue={f.au ?? ""} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="secondary">
            Filtrer
          </Button>
          {actifs && (
            <Button asChild variant="ghost" size="icon" aria-label="Retirer les filtres">
              <Link href="/location/amendes">
                <X />
              </Link>
            </Button>
          )}
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {amendes.length} PV{contrat ? ` · location ${contrat.numero}` : ""}
          {amendes.length === 300 ? " (300 premiers)" : ""}
        </span>
        <Button asChild variant="outline" size="sm">
          <a href="/api/amendes/export" download>
            <Download /> Exporter pour désignation (CSV)
          </a>
        </Button>
      </div>

      {amendes.length === 0 ? (
        <EtatVide icone={BadgeAlert} titre="Aucun PV" description={actifs ? "Aucun PV ne correspond à ces filtres." : "Importez les avis reçus : ils seront lus et rattachés au bon client."} />
      ) : (
        <ul className="flex flex-col gap-2" data-testid="liste-pv">
          {amendes.map((a) => (
            <li key={a.id}>
              <Link href={`/location/amendes/${a.id}`}>
                <Card
                  className={cn(
                    "flex flex-row items-center gap-3 p-4 hover:bg-accent",
                    a.echeance === "depassee" && "border-destructive/60",
                    a.echeance === "proche" && "border-warning/70",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {a.numeroAvis ? `Avis n° ${a.numeroAvis}` : a.infractionLe ? `PV du ${formatDateHeure(a.infractionLe)}` : "Avis importé"}
                      <Badge variant={VARIANTE_STATUT_AMENDE[a.statut]}>{LIBELLES_STATUT_AMENDE[a.statut]}</Badge>
                      {a.echeance === "depassee" && <Badge variant="destructive">Délai dépassé</Badge>}
                      {a.echeance === "proche" && a.dateLimite && <Badge variant="warning">Avant le {formatDate(a.dateLimite)}</Badge>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.infractionLe && `${a.heureInconnue ? formatDate(a.infractionLe) : formatDateHeure(a.infractionLe)} · `}
                      {a.vehicule ? (a.vehicule.immatriculation ?? a.nomVehicule) : (a.immatriculationLue ?? "véhicule à identifier")} ·{" "}
                      {a.client ? [a.client.prenom, a.client.nom].filter(Boolean).join(" ") : "aucun locataire"}
                      {a.contrat && ` · ${a.contrat.numero}`}
                      {a.nature && ` · ${a.nature}`}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{a.montantCentimes != null ? formatEuros(a.montantCentimes) : ""}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
