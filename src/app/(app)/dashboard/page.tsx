import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Car,
  ChevronRight,
  CircleAlert,
  Coins,
  Gauge,
  Globe,
  HandCoins,
  KeyRound,
  PiggyBank,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FiltrePeriode } from "@/components/analyse/filtre-periode";
import { Anneau, GraphiqueMensuel } from "@/components/analyse/graphiques";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatEuros, formatNombre, formatPourcentageBp } from "@/lib/format";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";
import { lirePeriode } from "@/lib/periode-url";
import { cn } from "@/lib/utils";
import { donneesDashboard } from "@/server/requetes/tableau-de-bord";
import { resumeSite } from "@/server/site/statistiques";

export const metadata: Metadata = { title: "Dashboard" };

type Indicateur = { titre: string; valeur: string; detail?: string; icone: LucideIcon; href: string; negatif?: boolean };

function CarteIndicateur({ i }: { i: Indicateur }) {
  const Icone = i.icone;
  return (
    <Link href={i.href} className="group">
      <Card className="h-full gap-1 p-4 transition-colors group-hover:border-primary/50">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{i.titre}</p>
          <Icone className="size-4 shrink-0 text-primary" aria-hidden />
        </div>
        <p className={cn("text-xl font-bold tabular-nums", i.negatif && "text-destructive")}>{i.valeur}</p>
        {i.detail && <p className="text-xs text-muted-foreground">{i.detail}</p>}
      </Card>
    </Link>
  );
}

export default async function PageDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utilisateur = await exigerRolePage(ROLES_GESTION);
  const { periode, du, au, partenaire } = lirePeriode(await searchParams);
  const [d, site] = await Promise.all([donneesDashboard(du, au, partenaire), resumeSite(7)]);
  const t = d.totaux;
  const plage = `du=${du}&au=${au}`;
  const qRapport = new URLSearchParams({ periode, ...(periode === "perso" ? { du, au } : {}), ...(d.partenaire ? { partenaire: d.partenaire.id } : {}) }).toString();
  const vendusHref = `/vehicules?etat=vendus&venteDu=${du}&venteAu=${au}${d.partenaire ? `&financeur=${d.partenaire.id}` : ""}`;

  const indicateurs: Indicateur[] = [
    {
      titre: "Bénéfice net",
      valeur: formatEuros(t.beneficeNetCentimes),
      detail: d.partenaire ? `Part de ${d.partenaire.nom} : ${formatEuros(t.partPartenaireCentimes)}` : `Ventes ${formatEuros(t.beneficeVenteCentimes)} · location ${formatEuros(t.revenusLocationCentimes - t.chargesLocationCentimes)}`,
      icone: TrendingUp,
      href: `/rapports?${qRapport}`,
      negatif: t.beneficeNetCentimes < 0,
    },
    { titre: "CA ventes", valeur: formatEuros(t.caVenteCentimes), detail: `${d.nbVendus} véhicule${d.nbVendus > 1 ? "s" : ""} vendu${d.nbVendus > 1 ? "s" : ""}`, icone: ShoppingCart, href: vendusHref },
    { titre: "Revenus location", valeur: formatEuros(t.revenusLocationCentimes), detail: "encaissés sur la période", icone: Banknote, href: `/location/paiements?${plage}` },
    { titre: "Dépenses", valeur: formatEuros(t.depensesCentimes), detail: "payées sur la période", icone: Receipt, href: `/depenses?${plage}` },
    { titre: "Véhicules en stock", valeur: String(d.nbStock), detail: "non vendus", icone: Car, href: `/vehicules${d.partenaire ? `?financeur=${d.partenaire.id}` : ""}` },
    { titre: "Capital immobilisé", valeur: formatEuros(d.capitalImmobiliseCentimes), detail: "coût de revient du stock", icone: PiggyBank, href: `/vehicules?tri=coutDeRevient${d.partenaire ? `&financeur=${d.partenaire.id}` : ""}` },
    {
      titre: "Marge moyenne / vente",
      valeur: d.margeMoyenneCentimes === null ? "—" : formatEuros(d.margeMoyenneCentimes),
      detail: d.margeMoyenneBp === null ? "aucune vente" : `soit ${formatPourcentageBp(d.margeMoyenneBp)} du prix de vente`,
      icone: Coins,
      href: vendusHref,
      negatif: (d.margeMoyenneCentimes ?? 0) < 0,
    },
    { titre: "Durée moyenne de revente", valeur: d.dureeMoyenneJours === null ? "—" : `${d.dureeMoyenneJours} j`, detail: "de l'achat à la vente", icone: CalendarClock, href: vendusHref },
    {
      titre: "Taux d'occupation",
      valeur: d.occupation.tauxBp === null ? "—" : formatPourcentageBp(d.occupation.tauxBp),
      detail: `${d.occupation.joursLoues} j loués / ${d.occupation.joursDisponibles} j disponibles`,
      icone: Gauge,
      href: "/location/planning",
    },
    { titre: "Loués / disponibles", valeur: `${d.loues} / ${d.disponibles}`, detail: "véhicules en ce moment", icone: KeyRound, href: "/vehicules?statut=EN_LOCATION" },
    {
      titre: "Impayés location",
      valeur: formatEuros(d.impayes.montantCentimes),
      detail: `${d.impayes.nombre} échéance${d.impayes.nombre > 1 ? "s" : ""} en retard`,
      icone: HandCoins,
      href: "/location/impayes",
      negatif: d.impayes.montantCentimes > 0,
    },
    { titre: "Investisseurs", valeur: String(d.capitalParPartenaire.length), detail: "avec du capital engagé", icone: Wallet, href: "/investisseurs" },
    {
      titre: "Site web (7 jours)",
      valeur: `${formatNombre(site.visites)} visite${site.visites > 1 ? "s" : ""}`,
      detail: `${formatNombre(site.clicsWhatsapp)} clic${site.clicsWhatsapp > 1 ? "s" : ""} WhatsApp`,
      icone: Globe,
      href: "/site-web/statistiques?periode=7",
    },
  ];

  return (
    <>
      <EnTetePage titre={`Bonjour ${utilisateur.nom.split(" ")[0]} 👋`} description={`Période du ${formatDate(du)} au ${formatDate(au)}${d.partenaire ? ` · véhicules financés par ${d.partenaire.nom}` : ""}.`} />
      <div className="mb-4">
        <FiltrePeriode periode={periode} du={du} au={au} partenaire={d.partenaire?.id} partenaires={d.partenaires} />
      </div>

      {d.alertes.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-5 text-warning" aria-hidden /> À traiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2 xl:grid-cols-3">
              {d.alertes.map((a) => (
                <li key={a.cle}>
                  <Link href={a.href} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        a.niveau === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-amber-700 dark:text-warning",
                      )}
                    >
                      {a.nombre}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        {a.niveau === "danger" && <CircleAlert className="size-3.5 shrink-0 text-destructive" aria-label="Urgent" />}
                        {a.titre}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{a.exemples.join(" · ")}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {indicateurs.map((i) => (
          <CarteIndicateur key={i.titre} i={i} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bénéfice mensuel (12 mois)</CardTitle>
            <CardDescription>Bénéfice des ventes et résultat de la location (loyers encaissés − charges).</CardDescription>
          </CardHeader>
          <CardContent>
            <GraphiqueMensuel donnees={d.mensuel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
            <CardDescription>Payées sur la période.</CardDescription>
          </CardHeader>
          <CardContent>
            <Anneau donnees={d.depensesParCategorie} libelleTotal="Dépenses par catégorie" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Véhicules les plus et les moins rentables</CardTitle>
            <CardDescription>Résultat de chaque véhicule sur la période (vente et location).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ListeClassement titre="Top 5" lignes={d.top} vide="Aucun bénéfice sur la période." />
            <ListeClassement titre="Les moins rentables" lignes={d.flop} vide="Aucun véhicule en perte sur la période." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux d&apos;occupation par véhicule</CardTitle>
            <CardDescription>Jours loués / jours disponibles sur la période (jours immobilisés exclus).</CardDescription>
          </CardHeader>
          <CardContent>
            {d.occupationParVehicule.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun véhicule de location sur la période.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {d.occupationParVehicule.map((o) => (
                  <li key={o.id}>
                    <Link href={`/vehicules/${o.id}/location`} className="block hover:opacity-80">
                      <div className="mb-1 flex items-baseline gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{o.immatriculation ?? o.nom}</span>
                        <span className="text-xs text-muted-foreground">
                          {o.joursLoues} / {o.joursDisponibles} j
                        </span>
                        <span className="w-16 whitespace-nowrap text-right font-medium tabular-nums">{formatPourcentageBp(o.tauxBp)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${o.tauxBp / 100}%`, background: "var(--serie-1)" }} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Capital investi par partenaire</CardTitle>
          <CardDescription>Achat + dépenses payées, sur les véhicules pas encore vendus (aujourd&apos;hui).</CardDescription>
        </CardHeader>
        <CardContent>
          <Anneau donnees={d.capitalParPartenaire} libelleTotal="Capital investi par partenaire" />
        </CardContent>
      </Card>
    </>
  );
}

function ListeClassement({ titre, lignes, vide }: { titre: string; lignes: { id: string; nom: string; immatriculation: string | null; montantCentimes: number }[]; vide: string }) {
  const max = Math.max(1, ...lignes.map((l) => Math.abs(l.montantCentimes)));
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titre}</p>
      {lignes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vide}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lignes.map((l) => (
            <li key={l.id}>
              <Link href={`/vehicules/${l.id}`} className="block hover:opacity-80">
                <div className="mb-1 flex items-baseline gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {l.nom}
                    {l.immatriculation && <span className="text-muted-foreground"> · {l.immatriculation}</span>}
                  </span>
                  <span className={cn("font-medium tabular-nums", l.montantCentimes < 0 && "text-destructive")}>{formatEuros(l.montantCentimes)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(Math.abs(l.montantCentimes) / max) * 100}%`, background: l.montantCentimes < 0 ? "var(--destructive)" : "var(--serie-1)" }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
