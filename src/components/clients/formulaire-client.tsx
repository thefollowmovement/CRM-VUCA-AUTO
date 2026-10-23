"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { CIVILITES, LIBELLES_CIVILITE, LIBELLES_PIECE, schemaClient, TYPES_PIECE, type SaisieClient } from "@/lib/validations/location";
import { creerClient, modifierClient } from "@/server/actions/clients";

/** Fiche client complète (création et modification). */
export function FormulaireClient({ clientId, valeurs }: { clientId?: string; valeurs: SaisieClient }) {
  const router = useRouter();
  const creation = !clientId;
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaClient, valeurs);
  const err = (n: keyof SaisieClient) => errors[n]?.message;
  const champ = (n: keyof SaisieClient, label: string, props: React.ComponentProps<typeof Input> = {}, obligatoire = false) => (
    <Champ label={label} htmlFor={n} erreur={err(n)} obligatoire={obligatoire}>
      <Input id={n} {...props} {...register(n)} />
    </Champ>
  );
  const listeNoire = watch("listeNoire");

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (creation) {
          const r = await creerClient(getValues());
          if (traiterResultat(r, setError) && r.donnees) router.push(`/clients/${r.donnees.id}`);
        } else if (traiterResultat(await modifierClient(clientId, getValues()), setError)) {
          router.push(`/clients/${clientId}`);
          router.refresh();
        }
      })}
      className="mx-auto flex max-w-3xl flex-col gap-4 pb-28"
    >
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
          <Champ label="Civilité" htmlFor="civilite" erreur={err("civilite")}>
            <SelectNatif id="civilite" {...register("civilite")}>
              <option value="">—</option>
              {CIVILITES.map((c) => (
                <option key={c} value={c}>
                  {LIBELLES_CIVILITE[c]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          {champ("nom", "Nom", { autoComplete: "off", autoFocus: creation }, true)}
          {champ("prenom", "Prénom", { autoComplete: "off" })}
          {champ("dateNaissance", "Date de naissance", { type: "date" })}
          {champ("lieuNaissance", "Lieu de naissance (ville)")}
          {champ("paysNaissance", "Pays de naissance")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {champ("telephone", "Téléphone", { type: "tel", inputMode: "tel" })}
          {champ("email", "Email", { type: "email", inputMode: "email" })}
          <div className="sm:col-span-2">{champ("adresse", "Adresse", { autoComplete: "address-line1" })}</div>
          <div className="sm:col-span-2">{champ("adresseComplement", "Complément d'adresse (bâtiment, étage…)", { autoComplete: "address-line2" })}</div>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 sm:col-span-2 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
            {champ("codePostal", "Code postal", { inputMode: "numeric" })}
            {champ("ville", "Ville")}
            <div className="col-span-2 sm:col-span-1">{champ("pays", "Pays")}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permis de conduire</CardTitle>
          <CardDescription>Une alerte s&apos;affiche si le permis est expiré ou trop récent (seuil dans les réglages).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {champ("numeroPermis", "Numéro de permis", { autoComplete: "off" })}
          {champ("categoriePermis", "Catégorie")}
          {champ("dateObtentionPermis", "Date d'obtention", { type: "date" })}
          {champ("dateDelivrancePermis", "Date de délivrance du titre (case 4a)", { type: "date" })}
          {champ("paysDelivrancePermis", "Pays de délivrance")}
          {champ("dateValiditePermis", "Valide jusqu'au", { type: "date" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pièce d&apos;identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
          <Champ label="Type" htmlFor="typePieceIdentite" erreur={err("typePieceIdentite")}>
            <SelectNatif id="typePieceIdentite" {...register("typePieceIdentite")}>
              <option value="">—</option>
              {TYPES_PIECE.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_PIECE[t]}
                </option>
              ))}
            </SelectNatif>
          </Champ>
          {champ("numeroPieceIdentite", "Numéro", { autoComplete: "off" })}
          {champ("dateValiditePieceIdentite", "Valide jusqu'au", { type: "date" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entreprise</CardTitle>
          <CardDescription>Facultatif : pour louer au nom d&apos;une société.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {champ("entreprise", "Raison sociale")}
          {champ("siretEntreprise", "SIRET", { inputMode: "numeric" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suivi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <CaseACocher className="mt-0.5" {...register("listeNoire")} />
            <span>
              <span className="font-medium">Liste noire</span>
              <span className="block text-xs text-muted-foreground">Le client ne pourra plus louer de véhicule.</span>
            </span>
          </label>
          {listeNoire && (
            <Champ label="Motif" htmlFor="motifListeNoire" erreur={err("motifListeNoire")} obligatoire>
              <Input id="motifListeNoire" placeholder="Ex. : impayé, véhicule rendu endommagé…" {...register("motifListeNoire")} />
            </Champ>
          )}
          <Champ label="Notes" htmlFor="notes" erreur={err("notes")}>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </Champ>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2">
          {Object.keys(errors).length > 0 && <p className="mr-auto text-sm text-destructive">Certains champs sont à corriger.</p>}
          <Button variant="outline" asChild>
            <Link href={creation ? "/clients" : `/clients/${clientId}`}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="animate-spin" />}
            {creation ? "Créer le client" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </form>
  );
}
