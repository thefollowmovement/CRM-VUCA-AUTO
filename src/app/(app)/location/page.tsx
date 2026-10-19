import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, Phone, Plus, Siren, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { BadgeContrat } from "@/components/location/badge-contrat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statutAffiche } from "@/lib/contrat";
import { jourParisISO } from "@/lib/dates";
import { formatDateHeure } from "@/lib/format";
import { nomVehicule } from "@/lib/vehicule";
import { vueAujourdhui } from "@/server/requetes/contrats";

export const metadata: Metadata = { title: "Location — aujourd'hui" };

type Ligne = Awaited<ReturnType<typeof vueAujourdhui>>["departs"][number];

const heureParis = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

function Quand({ date, aujourdhui, demain }: { date: Date; aujourdhui: string; demain: string }) {
  const jour = jourParisISO(date);
  const libelle = jour === aujourdhui ? "Aujourd'hui" : jour === demain ? "Demain" : formatDateHeure(date).slice(0, 10);
  return (
    <span className="flex w-20 shrink-0 flex-col text-sm">
      <span className="text-lg font-semibold tabular-nums">{heureParis.format(date)}</span>
      <span className="text-xs text-muted-foreground">{libelle}</span>
    </span>
  );
}

function Section({
  titre,
  icone: Icone,
  classe,
  lignes,
  date,
  vide,
  aujourdhui,
  demain,
  action,
}: {
  action?: { libelle: string; chemin: "depart" | "retour" };
  titre: string;
  icone: LucideIcon;
  classe: string;
  lignes: Ligne[];
  date: (l: Ligne) => Date;
  vide: string;
  aujourdhui: string;
  demain: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icone className={`size-5 ${classe}`} /> {titre}
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{lignes.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{vide}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {lignes.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <Quand date={date(l)} aujourdhui={aujourdhui} demain={demain} />
                <Link href={`/location/contrats/${l.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{[l.client.prenom, l.client.nom].filter(Boolean).join(" ")}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {nomVehicule(l.vehicule)}
                    {l.vehicule.immatriculation && ` · ${l.vehicule.immatriculation}`} · {l.numero}
                    {l.livraison && " · livraison"}
                  </span>
                  <span className="mt-1 block">
                    <BadgeContrat statut={statutAffiche(l.statut, l.retourPrevuLe)} />
                  </span>
                </Link>
                {action && (
                  <Button size="sm" asChild>
                    <Link href={`/location/contrats/${l.id}/${action.chemin}`}>{action.libelle}</Link>
                  </Button>
                )}
                {l.client.telephone && (
                  <Button variant="outline" size="icon" asChild aria-label={`Appeler ${l.client.nom}`}>
                    <a href={`tel:${l.client.telephone.replace(/\s/g, "")}`}>
                      <Phone />
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function PageAujourdhui() {
  const v = await vueAujourdhui();
  const aujourdhui = jourParisISO(new Date());
  const demain = jourParisISO(v.demain);
  const commun = { aujourdhui, demain };
  return (
    <>
      <EnTetePage
        titre="Aujourd'hui"
        description="Départs et retours d'aujourd'hui et de demain, locations en retard."
        actions={
          <Button asChild>
            <Link href="/location/contrats/nouveau">
              <Plus /> Nouvelle location
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {v.retards.length > 0 && (
          <div className="lg:col-span-2">
            <Section titre="En retard" icone={Siren} classe="text-destructive" lignes={v.retards} date={(l) => l.retourPrevuLe} vide="" action={{ libelle: "Retour", chemin: "retour" }} {...commun} />
          </div>
        )}
        <Section titre="Départs" icone={ArrowUpFromLine} classe="text-blue-600" lignes={v.departs} date={(l) => l.departPrevuLe} vide="Aucun départ prévu aujourd'hui ni demain." action={{ libelle: "Départ", chemin: "depart" }} {...commun} />
        <Section titre="Retours" icone={ArrowDownToLine} classe="text-emerald-600" lignes={v.retours} date={(l) => l.retourPrevuLe} vide="Aucun retour prévu aujourd'hui ni demain." action={{ libelle: "Retour", chemin: "retour" }} {...commun} />
        <div className="lg:col-span-2">
          <Section
            titre="Réservations à confirmer (7 jours)"
            icone={CalendarClock}
            classe="text-amber-600"
            lignes={v.aConfirmer}
            date={(l) => l.departPrevuLe}
            vide="Aucune réservation en attente de confirmation."
            {...commun}
          />
        </div>
      </div>
    </>
  );
}
