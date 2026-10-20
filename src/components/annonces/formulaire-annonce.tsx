"use client";

import { Bold, Eye, List, LoaderCircle, PenLine, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { TexteRiche } from "@/components/site/texte-riche";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { genererDescription, type EntreeDescription } from "@/lib/site/description";
import { CATEGORIES_EQUIPEMENTS, normaliserEquipements, ORDRE_CATEGORIES, type CategorieEquipement } from "@/lib/site/equipements";
import { dateCalendaireDepuisISO } from "@/lib/format";
import { schemaAnnonce, type SaisieAnnonce } from "@/lib/validations/site";
import { enregistrerAnnonce } from "@/server/actions/annonces";

export type CaracteristiquesAnnonce = Pick<
  EntreeDescription,
  "marque" | "modele" | "version" | "annee" | "kilometrage" | "carburant" | "boite" | "couleur" | "nombrePlaces"
> & { dateMiseEnCirculation: string | null };

export function FormulaireAnnonce({ vehiculeId, valeurs, caracteristiques }: { vehiculeId: string; valeurs: SaisieAnnonce; caracteristiques: CaracteristiquesAnnonce }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useFormulaire(schemaAnnonce, valeurs);
  const zone = useRef<HTMLTextAreaElement | null>(null);
  const [apercu, setApercu] = useState(false);
  const [ajout, setAjout] = useState("");
  const equipements = watch("equipements");
  const description = watch("description");
  const err = (n: keyof SaisieAnnonce) => errors[n]?.message as string | undefined;
  const { ref: refDescription, ...champDescription } = register("description");

  // --- Barre d'outils de la description : gras et listes uniquement
  const modifierTexte = (transformer: (texte: string, debut: number, fin: number) => { texte: string; curseur: number }) => {
    const el = zone.current;
    if (!el) return;
    const { texte, curseur } = transformer(el.value, el.selectionStart, el.selectionEnd);
    setValue("description", texte, { shouldDirty: true });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(curseur, curseur);
    });
  };
  const gras = () =>
    modifierTexte((t, a, b) => {
      const choix = t.slice(a, b) || "texte en gras";
      return { texte: `${t.slice(0, a)}**${choix}**${t.slice(b)}`, curseur: a + choix.length + 4 };
    });
  const liste = () =>
    modifierTexte((t, a, b) => {
      const debutLigne = t.lastIndexOf("\n", a - 1) + 1;
      const bloc = t.slice(debutLigne, b) || "élément";
      const avecPuces = bloc
        .split("\n")
        .map((l) => (/^\s*[-•*]\s+/.test(l) ? l : `- ${l}`))
        .join("\n");
      return { texte: `${t.slice(0, debutLigne)}${avecPuces}${t.slice(Math.max(b, debutLigne))}`, curseur: debutLigne + avecPuces.length };
    });
  const generer = () => {
    const v = getValues();
    const entier = (s: unknown) => (String(s ?? "").trim() && Number.isFinite(Number(s)) ? Number(s) : null);
    const texte = genererDescription({
      ...caracteristiques,
      dateMiseEnCirculation: caracteristiques.dateMiseEnCirculation ? dateCalendaireDepuisISO(caracteristiques.dateMiseEnCirculation) : null,
      puissanceCh: entier(v.puissanceCh),
      equipements: normaliserEquipements(v.equipements),
      ctAJour: v.ctAJour,
      ctDate: v.ctDate ? dateCalendaireDepuisISO(String(v.ctDate)) : null,
      carnetEntretien: v.carnetEntretien,
      rapportHistovec: v.rapportHistovec,
      premiereMain: v.premiereMain,
      nombreProprietaires: entier(v.nombreProprietaires),
      garantieMois: v.garantie ? entier(v.garantieMois) : null,
      nonFumeur: v.nonFumeur,
      reviseAvantVente: v.reviseAvantVente,
      travauxRealises: v.reviseAvantVente ? String(v.travauxRealises ?? "") || null : null,
    });
    if (String(v.description ?? "").trim() && !window.confirm("Remplacer la description actuelle par le texte généré ?")) return;
    setValue("description", texte, { shouldDirty: true });
    setApercu(false);
  };

  // --- Équipements
  const basculerEquipement = (c: CategorieEquipement, item: string, coche: boolean) => {
    const actuels = getValues(`equipements.${c}`) ?? [];
    setValue(`equipements.${c}`, coche ? [...actuels, item] : actuels.filter((x) => x !== item), { shouldDirty: true });
  };
  const ajouterLibre = () => {
    const t = ajout.trim();
    if (!t) return;
    const actuels = getValues("equipements.autres") ?? [];
    if (!actuels.includes(t)) setValue("equipements.autres", [...actuels, t], { shouldDirty: true });
    setAjout("");
  };

  const ctAJour = watch("ctAJour");
  const premiereMain = watch("premiereMain");
  const garantie = watch("garantie");
  const revise = watch("reviseAvantVente");
  const kmVerifie = watch("kilometrageVerifie");

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        if (traiterResultat(await enregistrerAnnonce(vehiculeId, getValues()), setError)) {
          reset(getValues());
          router.refresh();
        }
      })}
      className="flex flex-col gap-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Annonce</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Champ label="Titre de l'annonce" htmlFor="titre" erreur={err("titre")} obligatoire className="sm:col-span-2">
            <Input id="titre" {...register("titre")} />
          </Champ>
          <Champ label="Prix affiché" htmlFor="prixAffiche" erreur={err("prixAffiche")} aide="Prérempli avec le prix cible du véhicule.">
            <ChampMontant id="prixAffiche" {...register("prixAffiche")} />
          </Champ>
          <Champ label="Puissance (ch)" htmlFor="puissanceCh" erreur={err("puissanceCh")}>
            <Input id="puissanceCh" inputMode="numeric" {...register("puissanceCh")} />
          </Champ>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm sm:col-span-2">
            <CaseACocher {...register("prixNegociable")} /> Prix négociable
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Description</CardTitle>
            <CardDescription>Texte simple : gras et listes uniquement. Ton factuel.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={generer}>
            <Sparkles /> Générer une description
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Mise en forme">
            <Button type="button" variant="ghost" size="sm" onClick={gras} disabled={apercu} aria-label="Gras">
              <Bold /> Gras
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={liste} disabled={apercu} aria-label="Liste">
              <List /> Liste
            </Button>
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setApercu(!apercu)}>
              {apercu ? <PenLine /> : <Eye />} {apercu ? "Modifier" : "Aperçu"}
            </Button>
          </div>
          {apercu ? (
            <div className="min-h-40 rounded-md border bg-muted/30 p-3 text-sm">
              {String(description ?? "").trim() ? <TexteRiche texte={String(description)} /> : <p className="text-muted-foreground">Aucune description.</p>}
            </div>
          ) : (
            <Textarea
              id="description"
              rows={10}
              aria-label="Description publique"
              placeholder={"Exemple :\nVéhicule entretenu, carnet à jour.\n\n- Climatisation\n- **Garantie 6 mois**"}
              {...champDescription}
              ref={(el) => {
                refDescription(el);
                zone.current = el;
              }}
            />
          )}
          {err("description") && <p className="text-sm text-destructive">{err("description")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
          <CardDescription>Cochez les équipements présents ; ajoutez les autres librement.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {ORDRE_CATEGORIES.map((c) => (
            <fieldset key={c}>
              <legend className="mb-2 text-sm font-semibold">{CATEGORIES_EQUIPEMENTS[c].libelle}</legend>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES_EQUIPEMENTS[c].items.map((item) => (
                  <label key={item} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                    <CaseACocher checked={equipements?.[c]?.includes(item) ?? false} onChange={(e) => basculerEquipement(c, item, e.target.checked)} />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Autres équipements</legend>
            <div className="mb-2 flex flex-wrap gap-2">
              {(equipements?.autres ?? []).map((x) => (
                <span key={x} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm">
                  {x}
                  <button
                    type="button"
                    aria-label={`Retirer ${x}`}
                    className="rounded-full p-0.5 hover:bg-background"
                    onClick={() => setValue("equipements.autres", (getValues("equipements.autres") ?? []).filter((y) => y !== x), { shouldDirty: true })}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={ajout}
                onChange={(e) => setAjout(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ajouterLibre();
                  }
                }}
                placeholder="Ex. : Pack hiver"
                aria-label="Ajouter un équipement"
                maxLength={80}
              />
              <Button type="button" variant="outline" onClick={ajouterLibre}>
                <Plus /> Ajouter
              </Button>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Points de confiance</CardTitle>
          <CardDescription>Affichés en badges sur l&apos;annonce, uniquement s&apos;ils sont cochés. Ne cochez que ce qui est vérifiable.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <CaseACocher {...register("ctAJour")} /> Contrôle technique à jour
            </label>
            {ctAJour && (
              <Champ label="Date du contrôle technique" htmlFor="ctDate" erreur={err("ctDate")}>
                <Input id="ctDate" type="date" {...register("ctDate")} />
              </Champ>
            )}
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
            <CaseACocher {...register("carnetEntretien")} /> Carnet d&apos;entretien / factures disponibles
          </label>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
            <CaseACocher {...register("rapportHistovec")} /> Rapport Histovec disponible
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <CaseACocher {...register("premiereMain")} /> Première main
            </label>
            {!premiereMain && (
              <Champ label="Nombre de propriétaires" htmlFor="nombreProprietaires" erreur={err("nombreProprietaires")}>
                <Input id="nombreProprietaires" inputMode="numeric" {...register("nombreProprietaires")} />
              </Champ>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <CaseACocher {...register("garantie")} /> Garantie
            </label>
            {garantie && (
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                <Champ label="Mois" htmlFor="garantieMois" erreur={err("garantieMois")}>
                  <Input id="garantieMois" inputMode="numeric" {...register("garantieMois")} />
                </Champ>
                <Champ label="Détail" htmlFor="garantieTexte" erreur={err("garantieTexte")}>
                  <Input id="garantieTexte" placeholder="Ex. : moteur et boîte" {...register("garantieTexte")} />
                </Champ>
              </div>
            )}
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
            <CaseACocher {...register("nonFumeur")} /> Véhicule non-fumeur
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <CaseACocher {...register("reviseAvantVente")} /> Révisé avant la vente
            </label>
            {revise && (
              <Champ label="Travaux réalisés" htmlFor="travauxRealises" erreur={err("travauxRealises")}>
                <Textarea id="travauxRealises" rows={2} placeholder="Ex. : vidange, filtres, plaquettes avant" {...register("travauxRealises")} />
              </Champ>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
              <CaseACocher {...register("kilometrageVerifie")} /> Kilométrage vérifié
            </label>
            {kmVerifie && (
              <Champ label="Source" htmlFor="sourceKilometrage" erreur={err("sourceKilometrage")}>
                <Input id="sourceKilometrage" placeholder="Ex. : Histovec, factures d'entretien" {...register("sourceKilometrage")} />
              </Champ>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(var(--hauteur-barre-mobile,0px)+0.5rem)] z-10 flex justify-end md:bottom-4">
        <Button type="submit" disabled={isSubmitting} className="shadow-lg">
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {isDirty ? "Enregistrer l'annonce" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
