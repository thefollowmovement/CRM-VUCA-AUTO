"use client";

import { Building, LoaderCircle, Plus, TriangleAlert, Trash, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray } from "react-hook-form";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { resumerFinancement } from "@/lib/calculs/financement";
import { centimesVersSaisie, formatEuros, formatPourcentageBp, parseEurosEnCentimes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LIBELLES_BOITE,
  LIBELLES_CARBURANT,
  LIBELLES_CRITAIR,
  LIBELLES_PROVENANCE,
  LIBELLES_STATUT,
  LIBELLES_TYPE,
} from "@/lib/vehicule";
import {
  BOITES,
  CARBURANTS,
  CRITAIRS,
  PROVENANCES,
  schemaVehicule,
  STATUTS_INITIAUX,
  TYPES_EXPLOITATION,
  type SaisieVehicule,
} from "@/lib/validations/vehicule";
import { creerVehicule, modifierVehicule } from "@/server/actions/vehicules";

export type PartenaireChoix = { id: string; nom: string; type: "SOCIETE" | "INVESTISSEUR" };

export function FormulaireVehicule({
  vehiculeId,
  valeurs,
  partenaires,
}: {
  vehiculeId?: string;
  valeurs: SaisieVehicule;
  partenaires: PartenaireChoix[];
}) {
  const router = useRouter();
  const creation = !vehiculeId;
  const societe = partenaires.find((p) => p.type === "SOCIETE");
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaVehicule, valeurs);
  const lignes = useFieldArray({ control, name: "financement" });

  // --- Indicateur en direct du financement ---
  const prixAchat = parseEurosEnCentimes(String(watch("prixAchat") ?? "")) ?? 0;
  const lignesSaisies = (watch("financement") ?? []).map((l) => ({
    partenaireId: l.partenaireId,
    montantCentimes: Math.max(0, parseEurosEnCentimes(String(l.montant ?? "")) ?? 0),
  }));
  const resume = resumerFinancement(prixAchat, lignesSaisies);
  const typeExploitation = watch("typeExploitation");
  const forcerEcart = watch("forcerEcart");

  // Messages d'erreur (les noms de champs viennent du schéma partagé)
  const err = (nom: string): string | undefined => {
    const e = (errors as Record<string, { message?: string; root?: { message?: string } } | undefined>)[nom];
    return e?.message ?? e?.root?.message;
  };
  const errLigne = (i: number, champ: "partenaireId" | "montant") => errors.financement?.[i]?.[champ]?.message;

  const toutVuca = () => {
    if (!societe) return;
    lignes.replace([{ partenaireId: societe.id, montant: centimesVersSaisie(prixAchat || null), note: "" }]);
  };
  const ajouterLigne = () => {
    const dejaChoisis = new Set(lignesSaisies.map((l) => l.partenaireId));
    const suivant = partenaires.find((p) => !dejaChoisis.has(p.id));
    const reste = resume.resteCentimes > 0 ? centimesVersSaisie(resume.resteCentimes) : "";
    lignes.append({ partenaireId: suivant?.id ?? "", montant: reste, note: "" });
  };

  const soumettre = async () => {
    const saisie = getValues();
    if (creation) {
      const r = await creerVehicule(saisie);
      if (traiterResultat(r, setError) && r.donnees) router.push(`/vehicules/${r.donnees.id}`);
    } else {
      const r = await modifierVehicule(vehiculeId, saisie);
      if (traiterResultat(r, setError)) {
        router.push(`/vehicules/${vehiculeId}`);
        router.refresh();
      }
    }
  };

  const texte = (nom: keyof SaisieVehicule, label: string, props: React.ComponentProps<typeof Input> = {}, obligatoire = false) => (
    <Champ label={label} htmlFor={nom} erreur={err(nom)} obligatoire={obligatoire}>
      <Input id={nom} autoComplete="off" aria-invalid={!!err(nom)} {...props} {...register(nom)} />
    </Champ>
  );
  const nombre = (nom: keyof SaisieVehicule, label: string, aide?: string) => (
    <Champ label={label} htmlFor={nom} erreur={err(nom)} aide={aide}>
      <Input id={nom} inputMode="numeric" autoComplete="off" aria-invalid={!!err(nom)} {...register(nom)} />
    </Champ>
  );
  const date = (nom: keyof SaisieVehicule, label: string, obligatoire = false) => (
    <Champ label={label} htmlFor={nom} erreur={err(nom)} obligatoire={obligatoire}>
      <Input id={nom} type="date" aria-invalid={!!err(nom)} {...register(nom)} />
    </Champ>
  );
  const argent = (nom: keyof SaisieVehicule, label: string, obligatoire = false, aide?: string) => (
    <Champ label={label} htmlFor={nom} erreur={err(nom)} obligatoire={obligatoire} aide={aide}>
      <ChampMontant id={nom} aria-invalid={!!err(nom)} {...register(nom)} />
    </Champ>
  );
  const liste = (nom: keyof SaisieVehicule, label: string, options: readonly string[], libelles: Record<string, string>) => (
    <Champ label={label} htmlFor={nom} erreur={err(nom)}>
      <SelectNatif id={nom} {...register(nom)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {libelles[o]}
          </option>
        ))}
      </SelectNatif>
    </Champ>
  );

  return (
    <form noValidate onSubmit={handleSubmit(soumettre)} className="flex flex-col gap-4 pb-24">
      {/* 1. Identité */}
      <Card>
        <CardHeader>
          <CardTitle>Identité du véhicule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {texte("marque", "Marque", { placeholder: "Peugeot", autoCapitalize: "words" }, true)}
          {texte("modele", "Modèle", { placeholder: "208" }, true)}
          {texte("version", "Version / finition", { placeholder: "1.2 PureTech 100 Allure" })}
          {texte("immatriculation", "Immatriculation", { placeholder: "AB-123-CD", className: "uppercase" })}
          {texte("vin", "VIN (n° de série)", { placeholder: "17 caractères", className: "uppercase" })}
          {nombre("annee", "Année")}
          {date("dateMiseEnCirculation", "1re mise en circulation")}
          {liste("carburant", "Carburant", CARBURANTS, LIBELLES_CARBURANT)}
          {liste("boite", "Boîte", BOITES, LIBELLES_BOITE)}
          {texte("couleur", "Couleur")}
          {nombre("nombrePlaces", "Places")}
          {nombre("puissanceFiscale", "Puissance fiscale (CV)")}
          {liste("critAir", "Crit'Air", CRITAIRS, LIBELLES_CRITAIR)}
        </CardContent>
      </Card>

      {/* 2. Exploitation */}
      <Card>
        <CardHeader>
          <CardTitle>Exploitation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Type d'exploitation">
            {TYPES_EXPLOITATION.map((t) => (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium",
                  typeExploitation === t && "border-primary bg-primary/5 text-primary",
                )}
              >
                <input type="radio" value={t} className="accent-primary" {...register("typeExploitation")} />
                {LIBELLES_TYPE[t]}
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {creation && (
              <Champ label="Statut de départ" htmlFor="statutInitial">
                <SelectNatif id="statutInitial" {...register("statutInitial")}>
                  {STATUTS_INITIAUX.map((s) => (
                    <option key={s} value={s}>
                      {LIBELLES_STATUT[s]}
                    </option>
                  ))}
                </SelectNatif>
              </Champ>
            )}
            {typeExploitation !== "LOCATION" && argent("prixCible", "Prix affiché / cible", false, "Sert au bénéfice prévisionnel.")}
          </div>
        </CardContent>
      </Card>

      {/* 3. Achat */}
      <Card>
        <CardHeader>
          <CardTitle>Achat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {date("dateAchat", "Date d'achat", true)}
          {argent("prixAchat", "Prix d'achat", true)}
          {nombre("kilometrageAchat", "Kilométrage à l'achat")}
          {liste("provenance", "Provenance", PROVENANCES, LIBELLES_PROVENANCE)}
          {texte("nomVendeur", "Vendeur")}
          {texte("lienAnnonce", "Lien de l'annonce", { type: "url", inputMode: "url", placeholder: "https://…" })}
          <Champ label="Notes sur l'achat" htmlFor="notesAchat" erreur={err("notesAchat")} className="md:col-span-3">
            <Textarea id="notesAchat" rows={2} {...register("notesAchat")} />
          </Champ>
        </CardContent>
      </Card>

      {/* 4. Financement */}
      <Card id="financement" className={cn(err("financement") && "border-destructive")}>
        <CardHeader>
          <CardTitle>Qui finance l&apos;achat ?</CardTitle>
          <CardDescription>Une ligne par financeur. Le total doit être égal au prix d&apos;achat.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {societe && (
              <Button type="button" variant="outline" onClick={toutVuca}>
                <Building /> 100 % {societe.nom}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={ajouterLigne}>
              <Plus /> Ajouter un investisseur
            </Button>
          </div>

          {lignes.fields.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Aucun financeur pour l&apos;instant.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {lignes.fields.map((ligne, i) => {
              const choisi = partenaires.find((p) => p.id === lignesSaisies[i]?.partenaireId);
              return (
                <div key={ligne.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_5rem_auto] md:items-start">
                  <Champ label="Financeur" htmlFor={`financement.${i}.partenaireId`} erreur={errLigne(i, "partenaireId")} className="col-span-2 md:col-span-1">
                    <SelectNatif id={`financement.${i}.partenaireId`} {...register(`financement.${i}.partenaireId`)}>
                      <option value="">— Choisir —</option>
                      {partenaires.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom}
                          {p.type === "SOCIETE" ? " (société)" : ""}
                        </option>
                      ))}
                    </SelectNatif>
                  </Champ>
                  <Champ label="Montant" htmlFor={`financement.${i}.montant`} erreur={errLigne(i, "montant")}>
                    <ChampMontant id={`financement.${i}.montant`} {...register(`financement.${i}.montant`)} />
                  </Champ>
                  <div className="flex flex-col gap-1.5 self-end pb-2 text-right md:self-start md:pb-0">
                    <span className="hidden text-sm font-medium md:block">Part</span>
                    <span className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums md:h-9">
                      {choisi?.type === "SOCIETE" ? <Building className="size-3.5 text-primary" /> : <UserRound className="size-3.5 text-muted-foreground" />}
                      {resume.totalCentimes > 0 ? formatPourcentageBp(resume.pourcentagesBp[i]) : "—"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer cette ligne"
                    className="self-end text-destructive md:mt-6 md:self-start"
                    onClick={() => lignes.remove(i)}
                  >
                    <Trash />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Indicateur : total financé / prix d'achat / reste à financer */}
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total financé</p>
              <p className="font-semibold tabular-nums">{formatEuros(resume.totalCentimes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prix d&apos;achat</p>
              <p className="font-semibold tabular-nums">{formatEuros(prixAchat)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{resume.resteCentimes < 0 ? "Excédent" : "Reste à financer"}</p>
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  resume.etat === "complet" ? "text-success" : "text-destructive",
                )}
              >
                {formatEuros(Math.abs(resume.resteCentimes))}
              </p>
            </div>
          </div>

          {err("financement") && (
            <p className="text-sm text-destructive" role="alert">
              {err("financement")}
            </p>
          )}

          {resume.etat !== "complet" && prixAchat > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-warning/60 bg-warning/10 p-3">
              <p className="flex items-start gap-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                Le financement ne correspond pas au prix d&apos;achat. Corrigez les montants, ou enregistrez
                volontairement l&apos;écart en expliquant pourquoi.
              </p>
              <label className="flex items-center gap-2 text-sm font-medium">
                <CaseACocher {...register("forcerEcart")} /> Enregistrer avec cet écart
              </label>
              {forcerEcart && (
                <Champ label="Raison de l'écart" htmlFor="motifEcart" erreur={err("motifEcart")} obligatoire>
                  <Textarea id="motifEcart" rows={2} placeholder="Ex. : apport de l'investisseur pas encore reçu" {...register("motifEcart")} />
                </Champ>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Location */}
      {typeExploitation !== "ACHAT_REVENTE" && (
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Valeurs proposées par défaut à la création des contrats.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {argent("tarifJournalier", "Tarif journalier")}
            {argent("tarifHebdo", "Tarif hebdomadaire")}
            {argent("tarifMensuel", "Tarif mensuel")}
            {nombre("kmInclusParJour", "Km inclus par jour")}
            {nombre("kmInclusParMois", "Km inclus par mois")}
            {argent("prixKmSup", "Prix du km supplémentaire")}
            {argent("cautionDefaut", "Caution")}
            {argent("franchiseDefaut", "Franchise en cas de sinistre")}
            {date("dateMiseEnLocation", "Mise en location le")}
          </CardContent>
        </Card>
      )}

      {/* 6. Échéances */}
      <Card>
        <CardHeader>
          <CardTitle>Entretien et échéances</CardTitle>
          <CardDescription>Des alertes apparaîtront à l&apos;approche des dates (réglables dans Réglages).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {nombre("kilometrageActuel", "Kilométrage actuel")}
          {date("dateProchainControleTechnique", "Prochain contrôle technique")}
          {date("dateEcheanceAssurance", "Échéance assurance")}
          {texte("assureur", "Assureur")}
          {texte("numeroPoliceAssurance", "N° de police")}
          <span className="hidden md:block" />
          {date("dateProchaineVidange", "Prochaine vidange (date)")}
          {nombre("kmProchaineVidange", "Prochaine vidange (km)")}
          <span className="hidden md:block" />
          {date("dateProchaineRevision", "Prochaine révision (date)")}
          {nombre("kmProchaineRevision", "Prochaine révision (km)")}
        </CardContent>
      </Card>

      {/* 7. Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea id="notes" rows={3} aria-label="Notes" {...register("notes")} />
        </CardContent>
      </Card>

      {/* Barre d'actions toujours visible */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2">
          {Object.keys(errors).length > 0 && (
            <p className="mr-auto text-sm text-destructive">Certains champs sont à corriger.</p>
          )}
          <Button variant="outline" asChild>
            <Link href={creation ? "/vehicules" : `/vehicules/${vehiculeId}`}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            {creation ? "Créer le véhicule" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </form>
  );
}
