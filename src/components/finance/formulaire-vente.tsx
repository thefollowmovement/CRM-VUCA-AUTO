"use client";

import { BadgeEuro, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { TableauRepartition } from "@/components/finance/tableau-repartition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { calculerRentabilite, type EntreeRentabilite } from "@/lib/calculs/rentabilite";
import { repartirBenefice, type Investissement, type ParametresRepartition } from "@/lib/calculs/repartition";
import { formatEuros, formatPourcentageBp, parseEurosEnCentimes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LIBELLES_MODE_PAIEMENT, MODES_PAIEMENT, schemaVente, type SaisieVente } from "@/lib/validations/finance";
import { marquerVendu } from "@/server/actions/vehicules";

/** « Marquer comme vendu » : saisie de la vente + calcul final et répartition en direct. */
export function FormulaireVente({
  vehiculeId,
  valeurs,
  entree,
  investissements,
  parametres,
  noms,
}: {
  vehiculeId: string;
  valeurs: SaisieVente;
  entree: EntreeRentabilite;
  investissements: Investissement[];
  parametres: ParametresRepartition;
  noms: Record<string, string>;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaVente, valeurs);

  const prix = parseEurosEnCentimes(String(watch("prixVente") ?? ""));
  const r = prix !== null && prix > 0 ? calculerRentabilite({ ...entree, prixVenteCentimes: prix }) : null;
  const repartition = r?.beneficeCentimes != null ? repartirBenefice(investissements, r.beneficeCentimes, parametres) : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await marquerVendu(vehiculeId, getValues()), setError)) {
          router.push(`/vehicules/${vehiculeId}/financement`);
          router.refresh();
        }
      })}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-28 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vente</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <Champ label="Prix de vente" htmlFor="prixVente" erreur={errors.prixVente?.message} obligatoire className="sm:col-span-2">
              <ChampMontant id="prixVente" className="h-14 text-2xl font-semibold md:h-14 md:text-2xl" autoFocus {...register("prixVente")} />
            </Champ>
            <Champ label="Date de vente" htmlFor="dateVente" erreur={errors.dateVente?.message} obligatoire>
              <Input id="dateVente" type="date" {...register("dateVente")} />
            </Champ>
            <Champ label="Kilométrage" htmlFor="kilometrageVente" erreur={errors.kilometrageVente?.message}>
              <Input id="kilometrageVente" inputMode="numeric" {...register("kilometrageVente")} />
            </Champ>
            <Champ label="Mode de paiement" htmlFor="modePaiementVente" erreur={errors.modePaiementVente?.message} className="sm:col-span-2">
              <SelectNatif id="modePaiementVente" {...register("modePaiementVente")}>
                <option value="">Non précisé</option>
                {MODES_PAIEMENT.map((m) => (
                  <option key={m} value={m}>
                    {LIBELLES_MODE_PAIEMENT[m]}
                  </option>
                ))}
              </SelectNatif>
            </Champ>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acheteur</CardTitle>
            <CardDescription>Facultatif ; servira pour la facture de vente.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <Champ label="Nom" htmlFor="acheteurNom" erreur={errors.acheteurNom?.message}>
              <Input id="acheteurNom" autoComplete="off" {...register("acheteurNom")} />
            </Champ>
            <Champ label="Téléphone" htmlFor="acheteurTelephone" erreur={errors.acheteurTelephone?.message}>
              <Input id="acheteurTelephone" type="tel" {...register("acheteurTelephone")} />
            </Champ>
            <Champ label="Email" htmlFor="acheteurEmail" erreur={errors.acheteurEmail?.message} className="sm:col-span-2">
              <Input id="acheteurEmail" type="email" {...register("acheteurEmail")} />
            </Champ>
            <Champ label="Adresse" htmlFor="acheteurAdresse" erreur={errors.acheteurAdresse?.message} className="sm:col-span-2">
              <Textarea id="acheteurAdresse" rows={2} {...register("acheteurAdresse")} />
            </Champ>
            <Champ label="Notes" htmlFor="notesVente" erreur={errors.notesVente?.message} className="sm:col-span-2">
              <Textarea id="notesVente" rows={2} {...register("notesVente")} />
            </Champ>
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Calcul final</CardTitle>
          <CardDescription>Mis à jour pendant la saisie du prix.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {r ? (
            <>
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Coût de revient</dt>
                  <dd className="font-semibold tabular-nums">{formatEuros(r.coutDeRevientCentimes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Revenus</dt>
                  <dd className="font-semibold tabular-nums">{formatEuros(r.revenusCentimes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Bénéfice net</dt>
                  <dd className={cn("font-semibold tabular-nums", (r.beneficeCentimes ?? 0) < 0 ? "text-destructive" : "text-success")}>
                    {formatEuros(r.beneficeCentimes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Marge</dt>
                  <dd className="font-semibold tabular-nums">{formatPourcentageBp(r.margeBp)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ROI</dt>
                  <dd className="font-semibold tabular-nums">{formatPourcentageBp(r.roiBp)}</dd>
                </div>
              </dl>
              {repartition && <TableauRepartition repartition={repartition} noms={noms} societeId={parametres.societeId} />}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Saisissez le prix de vente.</p>
          )}
        </CardContent>
      </Card>

      {/* Barre d'actions toujours visible */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2">
          {Object.keys(errors).length > 0 && <p className="mr-auto text-sm text-destructive">Certains champs sont à corriger.</p>}
          <Button variant="outline" asChild>
            <Link href={`/vehicules/${vehiculeId}`}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <BadgeEuro />}
            Confirmer la vente
          </Button>
        </div>
      </div>
    </form>
  );
}
