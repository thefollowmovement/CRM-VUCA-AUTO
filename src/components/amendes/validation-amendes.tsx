"use client";

import { CheckCheck, ExternalLink, FileText, LoaderCircle, RotateCw, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { joursAvantLimite } from "@/lib/calculs/amendes";
import { dateVersSaisieParis } from "@/lib/dates";
import { centimesVersSaisie, dateCalendaireVersISO, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { schemaCorrectionAmende, type SaisieCorrectionAmende } from "@/lib/validations/amendes";
import { choisirContratAmende, corrigerAmende, relancerLectureAmende, validerAmendes, type RefusValidation } from "@/server/actions/amendes-import";
import type { LigneAValider } from "@/server/requetes/amendes-import";

/** Écran « À valider » : relire, corriger, choisir le locataire, puis valider en un clic. */
export function ValidationAmendes({ lignes, aujourdhuiISO }: { lignes: LigneAValider[]; aujourdhuiISO: string }) {
  const router = useRouter();
  // Pré-cochées : uniquement les lignes sans aucune raison de vérification.
  const [coches, setCoches] = useState<Set<string>>(() => new Set(lignes.filter((l) => l.raisons.length === 0).map((l) => l.id)));
  const [enCours, setEnCours] = useState(false);
  const [refus, setRefus] = useState<RefusValidation[]>([]);
  const presents = new Set(lignes.map((l) => l.id));
  const selection = [...coches].filter((id) => presents.has(id));

  const basculer = (id: string, oui: boolean) =>
    setCoches((s) => {
      const n = new Set(s);
      if (oui) n.add(id);
      else n.delete(id);
      return n;
    });

  async function valider() {
    setEnCours(true);
    const r = await validerAmendes(selection);
    setEnCours(false);
    if (r.ok) {
      setRefus(r.donnees?.refus ?? []);
      if (r.donnees?.valides === 0) toast.error("Aucun PV validé : voir les motifs ci-dessous.");
      else traiterResultat(r);
    } else traiterResultat(r);
    router.refresh();
  }

  const barre = (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={valider} disabled={enCours || selection.length === 0} data-testid="valider-selection">
        {enCours ? <LoaderCircle className="animate-spin" /> : <CheckCheck />} Valider la sélection ({selection.length})
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setCoches(new Set(selection.length === lignes.length ? [] : lignes.map((l) => l.id)))}>
        {selection.length === lignes.length ? "Tout décocher" : "Tout cocher"}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {barre}
      {refus.length > 0 && (
        <Card className="border-destructive/40 p-4 text-sm" role="alert">
          <p className="mb-2 font-medium">Non validés :</p>
          <ul className="flex flex-col gap-1">
            {refus.map((r) => (
              <li key={r.id}>
                Avis {r.numero ? `n° ${r.numero}` : "sans numéro"} : {r.motif}
                {r.clientId && r.motif.startsWith("fiche") && (
                  <>
                    {" "}
                    —{" "}
                    <Link href={`/clients/${r.clientId}/modifier`} className="font-medium text-primary underline">
                      compléter la fiche client
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ul className="flex flex-col gap-3">
        {lignes.map((l) => (
          <li key={l.id}>
            <LigneValidation ligne={l} coche={coches.has(l.id)} onCocher={(oui) => basculer(l.id, oui)} aujourdhuiISO={aujourdhuiISO} />
          </li>
        ))}
      </ul>
      {lignes.length > 3 && barre}
    </div>
  );
}

function valeursLigne(l: LigneAValider): SaisieCorrectionAmende {
  const saisie = dateVersSaisieParis(l.infractionLe); // AAAA-MM-JJTHH:MM (heure de Paris)
  return {
    numeroAvis: l.numeroAvis ?? "",
    dateAvis: dateCalendaireVersISO(l.dateAvis),
    dateInfraction: saisie.slice(0, 10),
    heureInfraction: l.infractionLe && !l.heureInconnue ? saisie.slice(11, 16) : "",
    immatriculation: l.immatriculationLue ?? "",
    nature: l.nature ?? "",
    lieu: l.lieu ?? "",
    montant: centimesVersSaisie(l.montantCentimes),
  };
}

function LigneValidation({ ligne: l, coche, onCocher, aujourdhuiISO }: { ligne: LigneAValider; coche: boolean; onCocher: (oui: boolean) => void; aujourdhuiISO: string }) {
  const router = useRouter();
  const [zoom, setZoom] = useState(false);
  const [sansApercu, setSansApercu] = useState(false);
  const [choixEnCours, setChoixEnCours] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useFormulaire(schemaCorrectionAmende, valeursLigne(l));
  const err = (n: keyof SaisieCorrectionAmende) => errors[n]?.message;
  const pre = `pv-${l.id}`;
  const aRelire = l.raisons.some((r) => r.code.startsWith("relire:"));
  const echeance = l.dateLimite ? joursAvantLimite(new Date(l.dateLimite), aujourdhuiISO) : null;
  const lectureImpossible = l.raisons.some((r) => r.code === "lecture_impossible");
  const ficheIncomplete = l.raisons.some((r) => r.code === "fiche_incomplete");
  const choix = l.identificationAuto ? "auto" : (l.contrat?.id ?? "societe");
  const estPdf = l.fichier?.typeMime === "application/pdf";

  return (
    <Card className={cn("grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-[150px_minmax(0,1fr)]", coche && "ring-2 ring-primary/40")} data-testid="ligne-pv">
      {/* Scan */}
      <div className="flex flex-row items-start gap-3 md:flex-col">
        <label className="flex items-center gap-2 text-sm font-medium">
          <CaseACocher checked={coche} onChange={(e) => onCocher(e.target.checked)} aria-label={`Sélectionner l'avis ${l.numeroAvis ?? ""}`} />
          Valider
        </label>
        {l.fichier ? (
          sansApercu ? (
            <a href={`/api/fichiers/${l.fichier.id}`} target="_blank" rel="noopener noreferrer" className="flex h-32 w-28 flex-col items-center justify-center gap-1 rounded-lg border text-xs text-muted-foreground hover:bg-accent md:w-full">
              <FileText className="size-6" /> Ouvrir le scan
            </a>
          ) : (
            <button type="button" onClick={() => setZoom(true)} className="overflow-hidden rounded-lg border bg-muted hover:opacity-90" aria-label="Agrandir le scan">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/fichiers/${l.fichier.id}?taille=mini`} alt="Scan de l'avis" className="h-40 w-28 object-cover object-top md:h-48 md:w-full" onError={() => setSansApercu(true)} />
            </button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">Aucun scan</span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {/* En-tête : échéance + raisons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/location/amendes/${l.id}`} className="font-semibold hover:underline">
            {l.numeroAvis ? `Avis n° ${l.numeroAvis}` : "Avis sans numéro"}
          </Link>
          {echeance !== null && (
            <Badge variant={echeance < 0 ? "destructive" : echeance < 10 ? "warning" : "secondary"}>
              {echeance < 0 ? `Délai dépassé (${formatDate(l.dateLimite)})` : `À désigner avant le ${formatDate(l.dateLimite)} (J-${echeance})`}
            </Badge>
          )}
          {l.raisons.map((r) => (
            <Badge key={r.code} variant={r.niveau === "blocage" ? "destructive" : "warning"} className="whitespace-normal">
              {r.texte}
            </Badge>
          ))}
        </div>

        {/* Champs lus, modifiables */}
        <form
          noValidate
          onSubmit={handleSubmit(async () => {
            if (traiterResultat(await corrigerAmende(l.id, getValues()), setError)) router.refresh();
          })}
          className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Champ label="N° d'avis" htmlFor={`${pre}-numero`} erreur={err("numeroAvis")}>
            <Input id={`${pre}-numero`} inputMode="numeric" {...register("numeroAvis")} />
          </Champ>
          <Champ label="Date de l'avis" htmlFor={`${pre}-dateAvis`} erreur={err("dateAvis")}>
            <Input id={`${pre}-dateAvis`} type="date" {...register("dateAvis")} />
          </Champ>
          <Champ label="Date de l'infraction" htmlFor={`${pre}-dateInfraction`} erreur={err("dateInfraction")}>
            <Input id={`${pre}-dateInfraction`} type="date" {...register("dateInfraction")} />
          </Champ>
          <Champ label="Heure" htmlFor={`${pre}-heure`} erreur={err("heureInfraction")} aide="Vide = heure inconnue">
            <Input id={`${pre}-heure`} type="time" {...register("heureInfraction")} />
          </Champ>
          <Champ label="Plaque" htmlFor={`${pre}-plaque`} erreur={err("immatriculation")}>
            <Input id={`${pre}-plaque`} className="uppercase" autoCapitalize="characters" {...register("immatriculation")} />
          </Champ>
          <Champ label="Montant" htmlFor={`${pre}-montant`} erreur={err("montant")}>
            <ChampMontant id={`${pre}-montant`} {...register("montant")} />
          </Champ>
          <Champ label="Nature" htmlFor={`${pre}-nature`} erreur={err("nature")} className="sm:col-span-2">
            <Input id={`${pre}-nature`} {...register("nature")} />
          </Champ>
          <Champ label="Lieu" htmlFor={`${pre}-lieu`} erreur={err("lieu")} className="sm:col-span-2 lg:col-span-3">
            <Input id={`${pre}-lieu`} {...register("lieu")} />
          </Champ>
          <div className="flex items-end">
            {(isDirty || aRelire || lectureImpossible) && (
              <Button type="submit" variant={isDirty ? "default" : "outline"} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />} {isDirty ? "Enregistrer" : "Confirmer les champs"}
              </Button>
            )}
          </div>
        </form>

        {/* Locataire proposé */}
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
            {l.client && l.contrat ? (
              <span className="min-w-0">
                <Link href={`/clients/${l.client.id}`} className="font-medium hover:underline">
                  {[l.client.prenom, l.client.nom].filter(Boolean).join(" ")}
                </Link>
                {" · "}
                <Link href={`/location/contrats/${l.contrat.id}`} className="hover:underline">
                  {l.contrat.numero}
                </Link>
                <span className="block text-muted-foreground">
                  Location du {formatDate(l.contrat.departReelLe ?? l.contrat.departPrevuLe)} au {formatDate(l.contrat.retourReelLe ?? l.contrat.retourPrevuLe)}
                </span>
                {ficheIncomplete && (
                  <Link href={`/clients/${l.client.id}/modifier`} className="font-medium text-primary underline">
                    Compléter la fiche client
                  </Link>
                )}
              </span>
            ) : choix === "societe" ? (
              <span>Aucun locataire : payé par la société.</span>
            ) : (
              <span className="text-muted-foreground">Aucun locataire trouvé{l.vehicule ? ` pour ${l.vehicule.nom}` : ""}.</span>
            )}
          </div>
          <label className="sr-only" htmlFor={`${pre}-contrat`}>
            Locataire
          </label>
          <SelectNatif
            id={`${pre}-contrat`}
            value={choix}
            disabled={choixEnCours}
            className="md:w-72"
            onChange={async (e) => {
              setChoixEnCours(true);
              const r = await choisirContratAmende(l.id, e.target.value);
              setChoixEnCours(false);
              if (traiterResultat(r)) router.refresh();
            }}
          >
            <option value="auto">Rapprochement automatique</option>
            {l.contratsPossibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} · {c.client} ({formatDate(c.debut)} → {formatDate(c.fin)})
              </option>
            ))}
            <option value="societe">Aucun / payé par la société</option>
          </SelectNatif>
        </div>

        {(lectureImpossible || !l.lu) && l.fichier && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (traiterResultat(await relancerLectureAmende(l.id))) router.refresh();
              }}
            >
              <RotateCw /> Relancer la lecture automatique
            </Button>
          </div>
        )}
      </div>

      {l.fichier && (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="md:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{l.numeroAvis ? `Avis n° ${l.numeroAvis}` : "Scan de l'avis"}</DialogTitle>
              <DialogDescription>
                <a href={`/api/fichiers/${l.fichier.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                  <ExternalLink className="size-4" /> Ouvrir le fichier d&apos;origine
                </a>
              </DialogDescription>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/fichiers/${l.fichier.id}${estPdf ? "?taille=page" : ""}`} alt="Scan de l'avis en grand" className="w-full rounded-lg border" />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
