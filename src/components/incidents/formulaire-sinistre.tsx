"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { LIBELLES_STATUT_SINISTRE, schemaSinistre, STATUTS_SINISTRE, type SaisieSinistre } from "@/lib/validations/paiement";
import { identifierConducteur } from "@/server/actions/amendes";
import { enregistrerSinistre } from "@/server/actions/sinistres";

type Location = { contratId: string; numero: string; client: string };

/**
 * Déclaration / modification d'un sinistre. La location en cours au moment des faits
 * est retrouvée automatiquement et proposée (on peut la décocher : sinistre à l'agence).
 */
export function FormulaireSinistre({
  id,
  valeurs,
  vehicules,
  locationActuelle,
}: {
  id?: string;
  valeurs: SaisieSinistre;
  vehicules: { id: string; libelle: string }[];
  locationActuelle?: Location | null;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaSinistre, valeurs);
  const vehiculeId = watch("vehiculeId");
  const quand = watch("survenuLe");
  const contratId = watch("contratId");
  const declare = watch("declareAssurance");
  const [proposee, setProposee] = useState<Location | null>(locationActuelle ?? null);
  const premier = useRef(true);

  useEffect(() => {
    // À l'ouverture d'une fiche existante, on garde la location enregistrée
    if (premier.current) {
      premier.current = false;
      if (id) return;
    }
    const t = setTimeout(async () => {
      const r = await identifierConducteur(vehiculeId, quand);
      const loc = r.ok ? (r.donnees ?? null) : null;
      setProposee(loc);
      setValue("contratId", loc?.contratId ?? "");
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculeId, quand]);
  const err = (n: keyof SaisieSinistre) => errors[n]?.message;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        const r = await enregistrerSinistre(id ?? null, getValues());
        if (traiterResultat(r, setError) && r.donnees) {
          router.push(`/location/sinistres/${r.donnees.id}`);
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
          <Champ label="Date et heure" htmlFor="survenuLe" erreur={err("survenuLe")} obligatoire>
            <Input id="survenuLe" type="datetime-local" {...register("survenuLe")} />
          </Champ>
          <Champ label="Lieu" htmlFor="lieu" erreur={err("lieu")}>
            <Input id="lieu" {...register("lieu")} />
          </Champ>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2" aria-live="polite">
            {proposee ? (
              <label className="flex cursor-pointer items-center gap-3">
                <CaseACocher checked={contratId === proposee.contratId} onChange={(e) => setValue("contratId", e.target.checked ? proposee.contratId : "")} />
                <span>
                  Pendant la location <strong>{proposee.numero}</strong> ({proposee.client})
                </span>
              </label>
            ) : (
              <span className="text-muted-foreground">Aucune location à ce moment-là (véhicule à l&apos;agence).</span>
            )}
          </div>
          <Champ label="Description" htmlFor="description" erreur={err("description")} obligatoire className="sm:col-span-2">
            <Textarea id="description" rows={3} placeholder="Circonstances, dégâts constatés…" {...register("description")} />
          </Champ>
          <Champ label="Coût estimé des réparations" htmlFor="coutEstime" erreur={err("coutEstime")}>
            <ChampMontant id="coutEstime" {...register("coutEstime")} />
          </Champ>
          <Champ label="Franchise à refacturer au client" htmlFor="franchiseRefacturee" erreur={err("franchiseRefacturee")}>
            <ChampMontant id="franchiseRefacturee" {...register("franchiseRefacturee")} />
          </Champ>
          <label className="flex cursor-pointer items-center gap-3 text-sm sm:col-span-2">
            <CaseACocher {...register("declareAssurance")} /> Déclaré à l&apos;assurance
          </label>
          {declare && (
            <>
              <Champ label="N° de dossier assurance" htmlFor="numeroDossierAssurance" erreur={err("numeroDossierAssurance")}>
                <Input id="numeroDossierAssurance" {...register("numeroDossierAssurance")} />
              </Champ>
              <Champ label="Indemnité encaissée" htmlFor="indemniteAssurance" erreur={err("indemniteAssurance")} aide="Comptée dans les revenus du véhicule.">
                <ChampMontant id="indemniteAssurance" {...register("indemniteAssurance")} />
              </Champ>
            </>
          )}
          <Champ label="Statut" htmlFor="statut" erreur={err("statut")}>
            <SelectNatif id="statut" {...register("statut")}>
              {STATUTS_SINISTRE.map((x) => (
                <option key={x} value={x}>
                  {LIBELLES_STATUT_SINISTRE[x]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Note" htmlFor="note" erreur={err("note")} className="sm:col-span-2">
            <Textarea id="note" rows={2} {...register("note")} />
          </Champ>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={id ? `/location/sinistres/${id}` : "/location/sinistres"}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
