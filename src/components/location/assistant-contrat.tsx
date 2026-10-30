"use client";

import { Ban, Check, ChevronLeft, ChevronRight, LoaderCircle, Search, TriangleAlert, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FieldPath } from "react-hook-form";
import { DialogueClientRapide, type ClientCree } from "@/components/clients/dialogue-client-rapide";
import { EncadreAlertes } from "@/components/clients/alertes-client";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { useFormulaire } from "@/components/formulaires/use-formulaire";
import { RecapPrix } from "@/components/location/recap-prix";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import { VignetteVehicule } from "@/components/vehicules/vignette-vehicule";
import { alertesClient } from "@/lib/calculs/clients";
import { calculerPrixLocation, decomposerDuree, kmInclusTotal } from "@/lib/calculs/location";
import { ajouterJoursParis, ajouterMoisParis, dateVersSaisieParis, saisieParisVersDate } from "@/lib/dates";
import { centimesVersSaisie, formatDateHeure, formatEuros, formatNombre, parseEurosEnCentimes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { valeursNouveauClient } from "@/lib/client-formulaire";
import {
  LIBELLES_MODE_CAUTION,
  LIBELLES_TYPE_LOCATION,
  MODES_CAUTION,
  schemaContrat,
  TYPES_LOCATION,
  UNITE_TYPE_LOCATION,
  type SaisieContrat,
} from "@/lib/validations/location";
import { creerContrat, disponibilites, modifierContrat } from "@/server/actions/contrats";
import type { ClientChoix } from "@/server/requetes/clients";
import type { VehiculeLouable } from "@/server/requetes/contrats";

export type OptionCatalogue = { id: string; libelle: string; modeTarif: "PAR_JOUR" | "FORFAIT"; prixCentimes: number; plafondCentimes: number | null };

const ETAPES = ["Client", "Véhicule et dates", "Tarif et caution", "Récapitulatif"] as const;

/** Étape où se trouve chaque champ (pour revenir dessus en cas d'erreur). */
const ETAPE_CHAMP: Record<string, number> = {
  clientId: 0, conducteursIds: 0,
  type: 1, departPrevuLe: 1, retourPrevuLe: 1, vehiculeId: 1,
  tarif: 2, tarifJournalier: 2, remise: 2, kilometrageIllimite: 2, kmInclusParUnite: 2, prixKmSup: 2, caution: 2, modeCaution: 2,
  franchise: 2, acompte: 2, jourEcheanceMensuelle: 2, livraison: 2, fraisLivraison: 2, lieuDepart: 2, lieuRetour: 2, options: 2,
};
const CHAMPS_ETAPE: FieldPath<SaisieContrat>[][] = [
  ["clientId", "conducteursIds"],
  ["type", "departPrevuLe", "retourPrevuLe", "vehiculeId"],
  ["tarif", "tarifJournalier", "remise", "kmInclusParUnite", "prixKmSup", "caution", "modeCaution", "franchise", "acompte", "jourEcheanceMensuelle", "fraisLivraison", "lieuDepart", "lieuRetour", "options"],
  [],
];

const nomClient = (c: { nom: string; prenom: string | null }) => [c.prenom, c.nom].filter(Boolean).join(" ");
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AssistantContrat({
  contratId,
  valeurs,
  clients: clientsInitiaux,
  vehicules,
  catalogue,
  toleranceMinutes,
  anciennetePermisMinAnnees,
  numero,
}: {
  contratId?: string;
  valeurs: SaisieContrat;
  clients: ClientChoix[];
  vehicules: VehiculeLouable[];
  catalogue: OptionCatalogue[];
  toleranceMinutes: number;
  anciennetePermisMinAnnees: number;
  numero?: string;
}) {
  const router = useRouter();
  const creation = !contratId;
  const [etape, setEtape] = useState(!creation ? 3 : valeurs.clientId ? (valeurs.vehiculeId ? 2 : 1) : 0);
  const [clients, setClients] = useState<(ClientChoix | ClientCree)[]>(clientsInitiaux);
  const [recherche, setRecherche] = useState("");
  const [conflits, setConflits] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useFormulaire(schemaContrat, valeurs);

  const v = watch();
  const client = clients.find((c) => c.id === v.clientId) ?? null;
  const vehicule = vehicules.find((x) => x.id === v.vehiculeId) ?? null;
  const auj = useMemo(() => new Date(), []);
  const alertes = client ? alertesClient(client, auj, anciennetePermisMinAnnees) : [];
  const unite = UNITE_TYPE_LOCATION[v.type];

  // --- Disponibilités : recalculées quand les dates changent ---
  useEffect(() => {
    const t = setTimeout(async () => {
      setVerification(true);
      const r = await disponibilites(v.departPrevuLe, v.retourPrevuLe, contratId);
      if (r.ok) setConflits(Object.fromEntries((r.donnees ?? []).map((c) => [c.vehiculeId, c.conflit])));
      setVerification(false);
    }, 250);
    return () => clearTimeout(t);
  }, [v.departPrevuLe, v.retourPrevuLe, contratId]);

  // --- Prix en direct (même fonction que le serveur) ---
  const depart = saisieParisVersDate(v.departPrevuLe);
  const retour = saisieParisVersDate(v.retourPrevuLe);
  const tarif = parseEurosEnCentimes(String(v.tarif ?? ""));
  const optionsChoisies = v.options.map((o) => ({ o, opt: catalogue.find((c) => c.id === o.optionId) })).filter((x) => x.opt);
  const prix =
    depart && retour && retour > depart && tarif !== null && tarif > 0
      ? calculerPrixLocation({
          type: v.type,
          depart,
          retour,
          toleranceMinutes,
          tarifCentimes: tarif,
          tarifJournalierCentimes: parseEurosEnCentimes(String(v.tarifJournalier ?? "")),
          remiseCentimes: parseEurosEnCentimes(String(v.remise ?? "")) ?? 0,
          fraisLivraisonCentimes: v.livraison ? (parseEurosEnCentimes(String(v.fraisLivraison ?? "")) ?? 0) : 0,
          options: optionsChoisies.map(({ o, opt }) => ({ modeTarif: opt!.modeTarif, prixCentimes: opt!.prixCentimes, plafondCentimes: opt!.plafondCentimes, quantite: Number(o.quantite) || 1 })),
        })
      : null;
  // Durée affichée dès que les dates sont valides (même sans tarif)
  const duree = depart && retour && retour > depart ? decomposerDuree(v.type, depart, retour, toleranceMinutes) : null;
  const kmParUnite = v.kilometrageIllimite ? null : Number(String(v.kmInclusParUnite ?? "").replace(/\s/g, "")) || null;
  const kmTotal = prix ? kmInclusTotal(v.type, kmParUnite, prix) : null;

  /** Préremplit tarifs, km, caution depuis la fiche du véhicule (selon le type de location). */
  const preremplir = (veh: VehiculeLouable | null, type: SaisieContrat["type"]) => {
    if (!veh) return;
    const tarifType = type === "JOURNALIERE" ? veh.tarifJournalierCentimes : type === "HEBDOMADAIRE" ? veh.tarifHebdoCentimes : veh.tarifMensuelCentimes;
    setValue("tarif", centimesVersSaisie(tarifType));
    setValue("tarifJournalier", centimesVersSaisie(veh.tarifJournalierCentimes));
    const km = type === "MENSUELLE" ? veh.kmInclusParMois : veh.kmInclusParJour;
    setValue("kmInclusParUnite", km === null ? "" : String(km));
    setValue("prixKmSup", centimesVersSaisie(veh.prixKmSupCentimes));
    setValue("caution", centimesVersSaisie(veh.cautionDefautCentimes));
    setValue("franchise", centimesVersSaisie(veh.franchiseDefautCentimes));
  };

  const suivant = async () => {
    if (!(await trigger(CHAMPS_ETAPE[etape]))) return;
    if (etape === 0 && alertes.some((a) => a.niveau === "bloquant")) return;
    if (etape === 1 && (conflits[v.vehiculeId] || vehicule?.statut === "IMMOBILISE")) return;
    setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enregistrer = handleSubmit(
    async () => {
      const saisie = getValues();
      const r = creation ? await creerContrat(saisie) : await modifierContrat(contratId, saisie);
      if (traiterResultat(r, setError)) {
        const id = creation ? (r.donnees as { id: string } | undefined)?.id : contratId;
        router.push(`/location/contrats/${id}`);
        router.refresh();
      } else if (!r.ok && r.erreursChamps) {
        const premiere = Object.keys(r.erreursChamps)[0]?.split(".")[0];
        if (premiere && ETAPE_CHAMP[premiere] !== undefined) setEtape(ETAPE_CHAMP[premiere]);
      }
    },
    (erreurs) => {
      const premiere = Object.keys(erreurs)[0];
      if (premiere && ETAPE_CHAMP[premiere] !== undefined) setEtape(ETAPE_CHAMP[premiere]);
    },
  );

  const err = (n: string) => (errors as Record<string, { message?: string } | undefined>)[n]?.message;
  const clientsFiltres = recherche.trim()
    ? clients.filter((c) => sansAccent(`${c.prenom ?? ""} ${c.nom} ${c.telephone ?? ""} ${c.email ?? ""}`).includes(sansAccent(recherche.trim())))
    : clients;

  const dureeRapide = (jours: number, mois = 0) => {
    if (!depart) return;
    const fin = mois ? ajouterMoisParis(depart, mois) : ajouterJoursParis(depart, jours);
    setValue("retourPrevuLe", dateVersSaisieParis(fin), { shouldValidate: true });
  };

  return (
    <form noValidate onSubmit={enregistrer} className="mx-auto flex max-w-4xl flex-col gap-4 pb-32">
      {/* Progression */}
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Étapes">
        {ETAPES.map((titre, i) => (
          <li key={titre}>
            <button
              type="button"
              onClick={() => i < etape && setEtape(i)}
              disabled={i > etape}
              className="flex w-full flex-col gap-1.5 text-left disabled:cursor-default"
              aria-current={i === etape ? "step" : undefined}
            >
              <span className={cn("h-1.5 rounded-full", i <= etape ? "bg-primary" : "bg-muted")} />
              <span className={cn("hidden text-xs sm:block", i === etape ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {i + 1}. {titre}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-semibold sm:hidden">
        {etape + 1}. {ETAPES[etape]}
      </h2>

      {/* ---------------- 1. Client ---------------- */}
      {etape === 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Conducteur principal</CardTitle>
              <CardDescription>Recherchez un client existant ou créez-le en quelques secondes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {client ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                  <UserRound className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{nomClient(client)}</p>
                    <p className="truncate text-sm text-muted-foreground">{[client.telephone, client.email].filter(Boolean).join(" · ") || "Aucun contact"}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setValue("clientId", "", { shouldValidate: false })}>
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, téléphone, email…" className="pl-9" aria-label="Rechercher un client" />
                    </div>
                    <DialogueClientRapide
                      valeurs={valeursNouveauClient()}
                      onCree={(c) => {
                        setClients((l) => [c, ...l]);
                        setValue("clientId", c.id, { shouldValidate: true });
                      }}
                    />
                  </div>
                  <ul className="flex max-h-80 flex-col divide-y overflow-y-auto rounded-lg border">
                    {clientsFiltres.slice(0, 30).map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setValue("clientId", c.id, { shouldValidate: true })}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-accent"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{nomClient(c)}</span>
                            <span className="block truncate text-xs text-muted-foreground">{[c.telephone, c.email].filter(Boolean).join(" · ") || "—"}</span>
                          </span>
                          {c.listeNoire && <Ban className="size-4 text-destructive" aria-label="Liste noire" />}
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                    {clientsFiltres.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun client trouvé : créez-le.</li>}
                  </ul>
                </>
              )}
              {err("clientId") && <p className="text-sm text-destructive">{err("clientId")}</p>}
              <EncadreAlertes alertes={alertes} />
              {alertes.some((a) => a.niveau === "bloquant") && (
                <p className="text-sm text-muted-foreground">Ce client ne peut pas louer tant que le problème n&apos;est pas réglé (fiche client).</p>
              )}
            </CardContent>
          </Card>

          {client && (
            <Card>
              <CardHeader>
                <CardTitle>Conducteurs additionnels</CardTitle>
                <CardDescription>Facultatif.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {v.conducteursIds.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {v.conducteursIds.map((id) => {
                      const c = clients.find((x) => x.id === id);
                      return (
                        <li key={id} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm">
                          {c ? nomClient(c) : "?"}
                          <button
                            type="button"
                            aria-label="Retirer"
                            onClick={() => setValue("conducteursIds", v.conducteursIds.filter((x) => x !== id))}
                            className="rounded-full p-0.5 hover:bg-background"
                          >
                            <X className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <SelectNatif
                    aria-label="Ajouter un conducteur"
                    value=""
                    onChange={(e) => e.target.value && setValue("conducteursIds", [...v.conducteursIds, e.target.value])}
                    className="min-w-0 flex-1"
                  >
                    <option value="">Ajouter un conducteur existant…</option>
                    {clients
                      .filter((c) => c.id !== v.clientId && !v.conducteursIds.includes(c.id) && !c.listeNoire)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {nomClient(c)}
                        </option>
                      ))}
                  </SelectNatif>
                  <DialogueClientRapide
                    libelle="Nouveau conducteur"
                    valeurs={valeursNouveauClient()}
                    onCree={(c) => {
                      setClients((l) => [c, ...l]);
                      setValue("conducteursIds", [...getValues("conducteursIds"), c.id]);
                    }}
                  />
                </div>
                {err("conducteursIds") && <p className="text-sm text-destructive">{err("conducteursIds")}</p>}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ---------------- 2. Véhicule et dates ---------------- */}
      {etape === 1 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Type et dates</CardTitle>
              <CardDescription>
                Journée de 24 h entamée = due (tolérance {toleranceMinutes} min). Mensuelle : mois date à date, dernier mois au prorata.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type de location">
                {TYPES_LOCATION.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={v.type === t}
                    onClick={() => {
                      setValue("type", t);
                      preremplir(vehicule, t);
                    }}
                    className={cn("h-11 rounded-lg border text-sm", v.type === t ? "border-primary bg-primary font-medium text-primary-foreground" : "hover:bg-accent")}
                  >
                    {LIBELLES_TYPE_LOCATION[t]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Champ label="Départ" htmlFor="departPrevuLe" erreur={err("departPrevuLe")} obligatoire>
                  <Input id="departPrevuLe" type="datetime-local" {...register("departPrevuLe")} />
                </Champ>
                <Champ label="Retour prévu" htmlFor="retourPrevuLe" erreur={err("retourPrevuLe")} obligatoire>
                  <Input id="retourPrevuLe" type="datetime-local" {...register("retourPrevuLe")} />
                </Champ>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Durée :</span>
                {(
                  [
                    ["1 jour", 1, 0],
                    ["3 jours", 3, 0],
                    ["1 semaine", 7, 0],
                    ["2 semaines", 14, 0],
                    ["1 mois", 0, 1],
                    ["3 mois", 0, 3],
                  ] as const
                ).map(([libelle, j, m]) => (
                  <Button key={libelle} type="button" variant="outline" size="sm" onClick={() => dureeRapide(j, m)}>
                    {libelle}
                  </Button>
                ))}
              </div>
              {duree && (
                <p className="text-sm">
                  Durée facturée : <strong>{duree.joursTotal} jour{duree.joursTotal > 1 ? "s" : ""}</strong>
                  {v.type !== "JOURNALIERE" &&
                    ` (${duree.unites} ${duree.unites > 1 ? unite[1] : unite[0]}${duree.joursSupplementaires ? ` + ${duree.joursSupplementaires} j` : ""})`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Véhicule {verification && <LoaderCircle className="size-4 animate-spin text-muted-foreground" />}
              </CardTitle>
              <CardDescription>Seuls les véhicules libres sur ces dates peuvent être choisis.</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicules.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun véhicule de location : passez un véhicule en « Location » ou « Mixte » dans sa fiche.
                </p>
              ) : (
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                  {vehicules.map((veh) => {
                    const conflit = conflits[veh.id];
                    const immobilise = veh.statut === "IMMOBILISE";
                    const indisponible = !!conflit || immobilise;
                    const choisi = v.vehiculeId === veh.id;
                    const tarifType = v.type === "JOURNALIERE" ? veh.tarifJournalierCentimes : v.type === "HEBDOMADAIRE" ? veh.tarifHebdoCentimes : veh.tarifMensuelCentimes;
                    return (
                      <li key={veh.id}>
                        <button
                          type="button"
                          disabled={indisponible && !choisi}
                          aria-pressed={choisi}
                          onClick={() => {
                            setValue("vehiculeId", veh.id, { shouldValidate: true });
                            preremplir(veh, v.type);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
                            choisi && !indisponible && "border-primary bg-primary/5 ring-1 ring-primary",
                            choisi && indisponible && "border-destructive",
                            indisponible ? "opacity-60" : "hover:bg-accent",
                          )}
                        >
                          <VignetteVehicule photoId={veh.photoId} alt={veh.nom} className="size-14 shrink-0 rounded-md" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{veh.nom}</span>
                            <span className="block text-xs text-muted-foreground">
                              {veh.immatriculation ?? "Sans immatriculation"} · {tarifType !== null ? `${formatEuros(tarifType)} / ${unite[0]}` : "tarif non renseigné"}
                            </span>
                            {immobilise ? (
                              <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-destructive">
                                <Ban className="size-3" /> Immobilisé
                              </span>
                            ) : conflit ? (
                              <span className="mt-0.5 block text-xs text-destructive">Déjà loué : {conflit}</span>
                            ) : (
                              <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-success">
                                <Check className="size-3" /> Disponible
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {err("vehiculeId") && <p className="mt-2 text-sm text-destructive">{err("vehiculeId")}</p>}
            </CardContent>
          </Card>
        </>
      )}

      {/* ---------------- 3. Tarif, options, caution ---------------- */}
      {etape === 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Tarif</CardTitle>
              <CardDescription>Prérempli depuis la fiche du véhicule, modifiable pour ce contrat.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
              <Champ label={`Tarif par ${unite[0]}`} htmlFor="tarif" erreur={err("tarif")} obligatoire>
                <ChampMontant id="tarif" {...register("tarif")} />
              </Champ>
              {v.type === "HEBDOMADAIRE" && (
                <Champ label="Tarif journalier (jours restants)" htmlFor="tarifJournalier" erreur={err("tarifJournalier")} aide="Vide = prorata du tarif hebdomadaire.">
                  <ChampMontant id="tarifJournalier" {...register("tarifJournalier")} />
                </Champ>
              )}
              <Champ label="Remise" htmlFor="remise" erreur={err("remise")}>
                <ChampMontant id="remise" {...register("remise")} />
              </Champ>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kilométrage</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label className="flex items-center gap-3 text-sm">
                <CaseACocher {...register("kilometrageIllimite")} /> Kilométrage illimité
              </label>
              {!v.kilometrageIllimite && (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                  <Champ
                    label={`Km inclus par ${v.type === "MENSUELLE" ? "mois" : "jour"}`}
                    htmlFor="kmInclusParUnite"
                    erreur={err("kmInclusParUnite")}
                    aide={kmTotal !== null ? `Soit ${formatNombre(kmTotal)} km inclus sur la location.` : undefined}
                  >
                    <Input id="kmInclusParUnite" inputMode="numeric" {...register("kmInclusParUnite")} />
                  </Champ>
                  <Champ label="Prix du km supplémentaire" htmlFor="prixKmSup" erreur={err("prixKmSup")}>
                    <ChampMontant id="prixKmSup" {...register("prixKmSup")} />
                  </Champ>
                </div>
              )}
            </CardContent>
          </Card>

          {catalogue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Options</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y">
                  {catalogue.map((opt) => {
                    const ligne = v.options.find((o) => o.optionId === opt.id);
                    const idx = v.options.findIndex((o) => o.optionId === opt.id);
                    return (
                      <li key={opt.id} className="flex items-center gap-3 py-2.5">
                        <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                          <CaseACocher
                            checked={!!ligne}
                            onChange={(e) =>
                              setValue(
                                "options",
                                e.target.checked ? [...v.options, { optionId: opt.id, quantite: 1 }] : v.options.filter((o) => o.optionId !== opt.id),
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{opt.libelle}</span>
                            <span className="block text-xs text-muted-foreground">
                              {formatEuros(opt.prixCentimes)} {opt.modeTarif === "PAR_JOUR" ? "/ jour" : "forfait"}
                              {opt.plafondCentimes != null && ` · plafond ${formatEuros(opt.plafondCentimes)}`}
                            </span>
                          </span>
                        </label>
                        {ligne && (
                          <SelectNatif
                            aria-label={`Quantité ${opt.libelle}`}
                            className="w-20"
                            value={String(ligne.quantite)}
                            onChange={(e) => setValue(`options.${idx}.quantite`, Number(e.target.value))}
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                × {n}
                              </option>
                            ))}
                          </SelectNatif>
                        )}
                        {ligne && prix && <span className="w-20 text-right text-sm tabular-nums">{formatEuros(prix.totalOptions[v.options.findIndex((o) => o.optionId === opt.id)] ?? 0)}</span>}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lieux et livraison</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <Champ label="Lieu de départ" htmlFor="lieuDepart" erreur={err("lieuDepart")}>
                <Input id="lieuDepart" placeholder="Agence" {...register("lieuDepart")} />
              </Champ>
              <Champ label="Lieu de retour" htmlFor="lieuRetour" erreur={err("lieuRetour")}>
                <Input id="lieuRetour" placeholder="Agence" {...register("lieuRetour")} />
              </Champ>
              <label className="flex items-center gap-3 text-sm sm:col-span-2">
                <CaseACocher {...register("livraison")} /> Livraison / reprise du véhicule
              </label>
              {v.livraison && (
                <Champ label="Frais de livraison" htmlFor="fraisLivraison" erreur={err("fraisLivraison")}>
                  <ChampMontant id="fraisLivraison" {...register("fraisLivraison")} />
                </Champ>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caution et paiement</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
              <Champ label="Caution" htmlFor="caution" erreur={err("caution")}>
                <ChampMontant id="caution" {...register("caution")} />
              </Champ>
              <Champ label="Mode de caution" htmlFor="modeCaution" erreur={err("modeCaution")}>
                <SelectNatif id="modeCaution" {...register("modeCaution")}>
                  <option value="">Non précisé</option>
                  {MODES_CAUTION.map((m) => (
                    <option key={m} value={m}>
                      {LIBELLES_MODE_CAUTION[m]}
                    </option>
                  ))}
                </SelectNatif>
              </Champ>
              <Champ label="Franchise en cas de sinistre" htmlFor="franchise" erreur={err("franchise")}>
                <ChampMontant id="franchise" {...register("franchise")} />
              </Champ>
              {v.type === "MENSUELLE" ? (
                <Champ label="Jour d'échéance mensuelle" htmlFor="jourEcheanceMensuelle" erreur={err("jourEcheanceMensuelle")} aide="Du 1 au 28 : jour où chaque loyer est dû (échéancier automatique).">
                  <Input id="jourEcheanceMensuelle" inputMode="numeric" {...register("jourEcheanceMensuelle")} />
                </Champ>
              ) : (
                <Champ label="Acompte demandé" htmlFor="acompte" erreur={err("acompte")}>
                  <ChampMontant id="acompte" {...register("acompte")} />
                </Champ>
              )}
              <Champ label="Notes" htmlFor="notes" erreur={err("notes")} className="sm:col-span-3">
                <Textarea id="notes" rows={2} {...register("notes")} />
              </Champ>
            </CardContent>
          </Card>
        </>
      )}

      {/* ---------------- 4. Récapitulatif ---------------- */}
      {etape === 3 && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Client</dt>
                  <dd className="font-medium">
                    {client ? nomClient(client) : "—"}
                    {v.conducteursIds.length > 0 && <span className="font-normal text-muted-foreground"> + {v.conducteursIds.length} conducteur(s)</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Véhicule</dt>
                  <dd className="font-medium">
                    {vehicule ? `${vehicule.nom}${vehicule.immatriculation ? ` · ${vehicule.immatriculation}` : ""}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{LIBELLES_TYPE_LOCATION[v.type]}</dt>
                  <dd className="font-medium">
                    du {depart ? formatDateHeure(depart) : "—"} au {retour ? formatDateHeure(retour) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Kilométrage</dt>
                  <dd className="font-medium">
                    {v.kilometrageIllimite ? "Illimité" : kmTotal !== null ? `${formatNombre(kmTotal)} km inclus` : "Non précisé"}
                    {!v.kilometrageIllimite && v.prixKmSup && ` · km sup ${v.prixKmSup} €`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Caution</dt>
                  <dd className="font-medium">
                    {formatEuros(parseEurosEnCentimes(String(v.caution ?? "")) ?? 0)}
                    {v.modeCaution && ` (${LIBELLES_MODE_CAUTION[v.modeCaution as keyof typeof LIBELLES_MODE_CAUTION]})`}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Prix</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {prix ? (
                <RecapPrix
                  r={{
                    ...prix,
                    type: v.type,
                    tarifCentimes: tarif ?? 0,
                    tarifJournalierCentimes: parseEurosEnCentimes(String(v.tarifJournalier ?? "")),
                    options: optionsChoisies.map(({ o, opt }, i) => ({ libelle: opt!.libelle, quantite: Number(o.quantite) || 1, totalCentimes: prix.totalOptions[i] ?? 0 })),
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Complétez le tarif et les dates.</p>
              )}
              {prix && prix.prixTotalCentimes < 0 && <p className="text-sm text-destructive">La remise dépasse le prix.</p>}
              <fieldset className="flex flex-col gap-2" role="radiogroup" aria-label="Statut">
                <legend className="mb-2 text-sm font-medium">Statut</legend>
                {(
                  [
                    ["RESERVATION", "Réservation", "Option posée, à confirmer avec le client."],
                    ["CONFIRMEE", "Confirmée", "Le client a confirmé (acompte versé…)."],
                  ] as const
                ).map(([valeur, titre, aide]) => (
                  <button
                    key={valeur}
                    type="button"
                    role="radio"
                    aria-checked={v.statut === valeur}
                    onClick={() => setValue("statut", valeur)}
                    className={cn("flex items-start gap-3 rounded-lg border p-3 text-left text-sm", v.statut === valeur && "border-primary bg-primary/5")}
                  >
                    <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", v.statut === valeur && "border-primary")}>
                      {v.statut === valeur && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="font-medium">{titre}</span>
                      <span className="block text-xs text-muted-foreground">{aide}</span>
                    </span>
                  </button>
                ))}
              </fieldset>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barre d'actions */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <div className="mr-auto min-w-0">
            {prix ? (
              <>
                <p className="text-xs text-muted-foreground">{numero ?? "Total"}</p>
                <p className="font-semibold tabular-nums">{formatEuros(prix.prixTotalCentimes)}</p>
              </>
            ) : (
              Object.keys(errors).length > 0 && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <TriangleAlert className="size-4" /> À corriger
                </p>
              )
            )}
          </div>
          {etape === 0 ? (
            <Button variant="outline" asChild>
              <Link href={contratId ? `/location/contrats/${contratId}` : "/location"}>Annuler</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setEtape((e) => e - 1)}>
              <ChevronLeft /> Retour
            </Button>
          )}
          {/* Clés distinctes : sinon React réutilise le même bouton, qui devient « submit »
              pendant le clic sur « Suivant » et enregistre le contrat trop tôt. */}
          {etape < ETAPES.length - 1 ? (
            <Button key="suivant" type="button" onClick={suivant}>
              Suivant <ChevronRight />
            </Button>
          ) : (
            <Button key="enregistrer" type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {creation ? "Créer le contrat" : "Enregistrer"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
