"use client";

import { Building, Camera, Ellipsis, FileText, LoaderCircle, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { ICONES_CATEGORIES } from "@/components/reglages/icone-categorie";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { compresserImage } from "@/lib/compression-image";
import { cn } from "@/lib/utils";
import { schemaDepense, type SaisieDepense } from "@/lib/validations/finance";
import { ajouterJustificatif, creerDepense, modifierDepense } from "@/server/actions/depenses";
import type { OptionsDepense } from "@/server/requetes/depenses";

/**
 * Saisie d'une dépense, pensée pour le téléphone :
 * photo du ticket → montant → catégorie → payé par → véhicule.
 * En création, le justificatif est envoyé juste après l'enregistrement.
 */
export function FormulaireDepense({
  depenseId,
  valeurs,
  options,
  retour,
}: {
  depenseId?: string;
  valeurs: SaisieDepense;
  options: OptionsDepense;
  /** Page où revenir après l'enregistrement. */
  retour: string;
}) {
  const router = useRouter();
  const creation = !depenseId;
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaDepense, valeurs);
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [plusDeDetails, setPlusDeDetails] = useState(!creation);
  const champFichier = useRef<HTMLInputElement>(null);
  const encore = useRef(false); // « Enregistrer et en saisir une autre »

  // Aperçu de la photo du ticket
  useEffect(() => {
    if (!fichier || !fichier.type.startsWith("image/")) {
      setApercu(null);
      return;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const categorieId = watch("categorieId");
  const payeParId = watch("payeParId");

  const enregistrer = handleSubmit(async () => {
    const saisie = getValues();
    if (!creation) {
      if (traiterResultat(await modifierDepense(depenseId, saisie), setError)) {
        router.push(retour);
        router.refresh();
      }
      return;
    }
    const r = await creerDepense(saisie);
    if (!traiterResultat(r, setError)) return;
    const id = r.donnees?.id;
    if (fichier && id) {
      const f = new FormData();
      f.set("depenseId", id);
      f.set("justificatif", await compresserImage(fichier, 2000, 0.85));
      const envoi = await ajouterJustificatif(f);
      if (!envoi.ok) {
        // La dépense est enregistrée : on ouvre sa fiche pour réessayer l'envoi.
        toast.error(`Justificatif non envoyé : ${envoi.message}`);
        router.push(`/depenses/${id}`);
        return;
      }
    }
    if (encore.current) {
      // On garde le véhicule, le payeur et la date pour enchaîner les tickets.
      reset({ ...valeurs, vehiculeId: saisie.vehiculeId, payeParId: saisie.payeParId, date: saisie.date });
      setFichier(null);
      if (champFichier.current) champFichier.current.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
      return;
    }
    router.push(retour);
    router.refresh();
  });

  return (
    <form noValidate onSubmit={enregistrer} className="mx-auto flex max-w-2xl flex-col gap-4 pb-28">
      {/* 1. Photo du ticket */}
      {creation && (
        <Card>
          <CardContent className="flex items-center gap-4 pt-4 md:pt-6">
            <input
              ref={champFichier}
              id="justificatif"
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
            {fichier ? (
              <>
                {apercu ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={apercu} alt="Ticket" className="size-20 shrink-0 rounded-lg border object-cover" />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <FileText className="size-8 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fichier.name}</p>
                  <p className="text-xs text-muted-foreground">Envoyé avec la dépense.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer le justificatif"
                  onClick={() => {
                    setFichier(null);
                    if (champFichier.current) champFichier.current.value = "";
                  }}
                >
                  <X />
                </Button>
              </>
            ) : (
              <label
                htmlFor="justificatif"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Camera className="size-5" /> Photo du ticket ou facture (facultatif)
              </label>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Montant */}
      <Card>
        <CardContent className="flex flex-col gap-5 pt-4 md:pt-6">
          <Champ label="Montant payé" htmlFor="montant" erreur={errors.montant?.message} obligatoire>
            <ChampMontant id="montant" className="h-14 text-2xl font-semibold md:h-14 md:text-2xl" autoFocus={creation} {...register("montant")} />
          </Champ>

          {/* 3. Catégorie */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              Catégorie<span className="ml-0.5 text-destructive">*</span>
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {options.categories.map((c) => {
                const Icone = (c.icone && ICONES_CATEGORIES[c.icone]) || Ellipsis;
                const choisie = categorieId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={choisie}
                    onClick={() => setValue("categorieId", c.id, { shouldValidate: true })}
                    className={cn(
                      "flex min-h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border p-2 text-center text-xs leading-tight transition-colors",
                      choisie ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary" : "hover:bg-accent",
                    )}
                  >
                    <span
                      className="flex size-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${c.couleur ?? "#78716c"}22`, color: c.couleur ?? "#78716c" }}
                    >
                      <Icone className="size-4" />
                    </span>
                    <span className="line-clamp-2 break-words">{c.nom}</span>
                  </button>
                );
              })}
            </div>
            {errors.categorieId?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.categorieId.message}
              </p>
            )}
          </fieldset>

          {/* 4. Payé par */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              Payé par<span className="ml-0.5 text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {options.partenaires.map((p) => {
                const choisi = payeParId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={choisi}
                    onClick={() => setValue("payeParId", p.id, { shouldValidate: true })}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                      choisi ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {p.type === "SOCIETE" ? <Building className="size-4" /> : <UserRound className="size-4" />}
                    {p.nom}
                  </button>
                );
              })}
            </div>
            {errors.payeParId?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.payeParId.message}
              </p>
            )}
            <label className="mt-1 flex items-start gap-3 rounded-lg border p-3 text-sm">
              <CaseACocher className="mt-0.5" {...register("payeSurRecettes")} />
              <span>
                <span className="font-medium">Payée avec les recettes du véhicule</span>
                <span className="block text-xs text-muted-foreground">
                  Ex. : assurance payée avec les loyers. La dépense réduit le résultat mais ne compte pas comme un investissement du payeur.
                </span>
              </span>
            </label>
          </fieldset>
        </CardContent>
      </Card>

      {/* 5. Véhicule + date */}
      <Card>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:pt-6">
          <Champ label="Véhicule" htmlFor="vehiculeId" erreur={errors.vehiculeId?.message} obligatoire>
            <SelectNatif id="vehiculeId" {...register("vehiculeId")}>
              <option value="">Choisir un véhicule…</option>
              {options.vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.libelle}
                  {v.vendu ? " (vendu)" : ""}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          <Champ label="Date" htmlFor="date" erreur={errors.date?.message} obligatoire>
            <Input id="date" type="date" {...register("date")} />
          </Champ>
        </CardContent>
      </Card>

      {/* 6. Détails facultatifs */}
      {plusDeDetails ? (
        <Card>
          <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-4 sm:grid-cols-2 md:pt-6">
            <Champ label="Libellé" htmlFor="libelle" erreur={errors.libelle?.message} aide="Vide = nom de la catégorie.">
              <Input id="libelle" placeholder="Ex. : embrayage complet" {...register("libelle")} />
            </Champ>
            <Champ label="Fournisseur" htmlFor="fournisseur" erreur={errors.fournisseur?.message}>
              <Input id="fournisseur" placeholder="Ex. : Garage Martin" {...register("fournisseur")} />
            </Champ>
            <Champ label="Kilométrage" htmlFor="kilometrage" erreur={errors.kilometrage?.message} aide="Met à jour le compteur du véhicule s'il est plus élevé.">
              <Input id="kilometrage" inputMode="numeric" placeholder="Ex. : 85 400" {...register("kilometrage")} />
            </Champ>
            <Champ label="Note" htmlFor="note" erreur={errors.note?.message} className="sm:col-span-2">
              <Textarea id="note" rows={2} {...register("note")} />
            </Champ>
          </CardContent>
        </Card>
      ) : (
        <Button type="button" variant="ghost" className="self-start" onClick={() => setPlusDeDetails(true)}>
          + Libellé, fournisseur, kilométrage, note
        </Button>
      )}

      {/* Barre d'actions toujours visible */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-end gap-2">
          {Object.keys(errors).length > 0 && <p className="mr-auto text-sm text-destructive">Certains champs sont à corriger.</p>}
          <Button variant="outline" asChild>
            <Link href={retour}>Annuler</Link>
          </Button>
          {creation && (
            <Button type="submit" variant="outline" disabled={isSubmitting} onClick={() => (encore.current = true)} className="hidden sm:inline-flex">
              Enregistrer et en saisir une autre
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} onClick={() => (encore.current = false)}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}
