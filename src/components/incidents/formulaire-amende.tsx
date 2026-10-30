"use client";

import { LoaderCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { LIBELLES_STATUT_AMENDE, schemaAmende, STATUTS_AMENDE, type SaisieAmende } from "@/lib/validations/paiement";
import { enregistrerAmende, identifierConducteur } from "@/server/actions/amendes";

/** Saisie d'un PV : le contrat et le client sont retrouvés d'après le véhicule et la date/heure. */
export function FormulaireAmende({ id, valeurs, vehicules }: { id?: string; valeurs: SaisieAmende; vehicules: { id: string; libelle: string }[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaAmende, valeurs);
  const vehiculeId = watch("vehiculeId");
  const quand = watch("infractionLe");
  const [identification, setIdentification] = useState<{ contratId: string; numero: string; client: string } | null | undefined>(undefined);
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await identifierConducteur(vehiculeId, quand);
      setIdentification(r.ok ? (r.donnees ?? null) : undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [vehiculeId, quand]);
  const err = (n: keyof SaisieAmende) => errors[n]?.message;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        const r = await enregistrerAmende(id ?? null, getValues());
        if (traiterResultat(r, setError) && r.donnees) {
          router.push(`/location/amendes/${r.donnees.id}`);
          router.refresh();
        }
      })}
      className="flex flex-col gap-4"
    >
      <Card>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-4 sm:grid-cols-2 md:pt-6">
          <Champ label="Véhicule" htmlFor="vehiculeId" erreur={err("vehiculeId")} obligatoire className="sm:col-span-2">
            <SelectNatif id="vehiculeId" {...register("vehiculeId")}>
              <option value="">Choisir…</option>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.libelle}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Date et heure de l'infraction" htmlFor="infractionLe" erreur={err("infractionLe")} obligatoire>
            <Input id="infractionLe" type="datetime-local" {...register("infractionLe")} />
          </Champ>
          <Champ label="Montant" htmlFor="montant" erreur={err("montant")} obligatoire>
            <ChampMontant id="montant" {...register("montant")} />
          </Champ>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2" aria-live="polite">
            {identification === undefined ? (
              <span className="text-muted-foreground">Choisissez le véhicule et la date pour retrouver le conducteur.</span>
            ) : identification ? (
              <span className="flex items-center gap-2">
                <UserRound className="size-4 text-primary" /> Conducteur identifié : <strong>{identification.client}</strong> ·{" "}
                <Link href={`/location/contrats/${identification.contratId}`} className="underline">
                  {identification.numero}
                </Link>
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">Aucune location à ce moment-là : le véhicule était à l&apos;agence.</span>
            )}
          </div>
          <Champ label="Lieu" htmlFor="lieu" erreur={err("lieu")} className="sm:col-span-2">
            <Input id="lieu" placeholder="Ex. : Lyon 3e, cours Gambetta" {...register("lieu")} />
          </Champ>
          <Champ label="N° d'avis" htmlFor="numeroAvis" erreur={err("numeroAvis")}>
            <Input id="numeroAvis" {...register("numeroAvis")} />
          </Champ>
          <Champ label="Statut" htmlFor="statut" erreur={err("statut")}>
            <SelectNatif id="statut" {...register("statut")}>
              {STATUTS_AMENDE.filter((x) => x !== "REFACTUREE" || valeurs.statut === "REFACTUREE").map((x) => (
                <option key={x} value={x}>
                  {LIBELLES_STATUT_AMENDE[x]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Reçu le" htmlFor="dateReception" erreur={err("dateReception")}>
            <Input id="dateReception" type="date" {...register("dateReception")} />
          </Champ>
          <Champ label="À traiter avant le" htmlFor="dateLimite" erreur={err("dateLimite")}>
            <Input id="dateLimite" type="date" {...register("dateLimite")} />
          </Champ>
          <Champ label="Note" htmlFor="note" erreur={err("note")} className="sm:col-span-2">
            <Textarea id="note" rows={2} {...register("note")} />
          </Champ>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={id ? `/location/amendes/${id}` : "/location/amendes"}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
