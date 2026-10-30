import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/en-tete-page";
import { PlanningGantt } from "@/components/location/planning-gantt";
import { Button } from "@/components/ui/button";
import { ajouterJoursParis, ajouterMoisParis, dateDepuisParis, debutJourParis, jourISOVersDateParis, jourParisISO, partiesParis } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { contratsPlanning, vehiculesLouables } from "@/server/requetes/contrats";

export const metadata: Metadata = { title: "Planning" };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export default async function PagePlanning({ searchParams }: { searchParams: Promise<{ vue?: string; date?: string }> }) {
  const sp = await searchParams;
  const vue = sp.vue === "mois" ? "mois" : "semaine";
  const reference = (sp.date && jourISOVersDateParis(sp.date)) || debutJourParis(new Date());
  const p = partiesParis(reference);

  // Semaine du lundi au dimanche, ou mois entier
  let debut: Date;
  let fin: Date;
  if (vue === "semaine") {
    const jourSemaine = (new Date(Date.UTC(p.annee, p.mois - 1, p.jour)).getUTCDay() + 6) % 7; // lundi = 0
    debut = ajouterJoursParis(reference, -jourSemaine);
    fin = ajouterJoursParis(debut, 7);
  } else {
    debut = dateDepuisParis(p.annee, p.mois, 1);
    fin = ajouterMoisParis(debut, 1);
  }
  const jours: Date[] = [];
  for (let j = debut; j < fin; j = ajouterJoursParis(j, 1)) jours.push(j);

  const [vehicules, contrats] = await Promise.all([vehiculesLouables(), contratsPlanning(debut, fin)]);
  const precedent = vue === "semaine" ? ajouterJoursParis(debut, -7) : ajouterMoisParis(debut, -1);
  const suivant = vue === "semaine" ? fin : ajouterMoisParis(debut, 1);
  const lien = (date: Date, v = vue) => `/location/planning?vue=${v}&date=${jourParisISO(date)}`;
  const dernier = jours[jours.length - 1]!;
  const titre =
    vue === "mois"
      ? `${MOIS[p.mois - 1]} ${p.annee}`
      : `du ${partiesParis(debut).jour} ${MOIS[partiesParis(debut).mois - 1]} au ${partiesParis(dernier).jour} ${MOIS[partiesParis(dernier).mois - 1]} ${partiesParis(dernier).annee}`;

  return (
    <>
      <EnTetePage
        titre="Planning"
        description={`Véhicules de location · ${titre}`}
        actions={
          <Button asChild>
            <Link href="/location/contrats/nouveau">
              <Plus /> Nouvelle location
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Button variant="outline" size="icon" asChild aria-label="Période précédente">
            <Link href={lien(precedent)}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={lien(debutJourParis(new Date()))}>Aujourd&apos;hui</Link>
          </Button>
          <Button variant="outline" size="icon" asChild aria-label="Période suivante">
            <Link href={lien(suivant)}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <div className="ml-auto flex rounded-lg border p-0.5 text-sm">
          {(["semaine", "mois"] as const).map((v) => (
            <Link
              key={v}
              href={lien(reference, v)}
              className={cn("rounded-md px-3 py-1.5 capitalize", vue === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>
      <PlanningGantt
        vehicules={vehicules.map((v) => ({ id: v.id, nom: v.nom, immatriculation: v.immatriculation, photoId: v.photoId, immobilise: v.statut === "IMMOBILISE" }))}
        contrats={contrats}
        jours={jours}
        debut={debut}
        fin={fin}
        largeurJour={vue === "semaine" ? 72 : 34}
      />
    </>
  );
}
