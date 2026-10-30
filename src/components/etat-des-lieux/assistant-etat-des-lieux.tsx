"use client";

import { Camera, ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus, RefreshCw, Trash, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChampMontant } from "@/components/formulaires/champ-montant";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { CaseACocher } from "@/components/ui/case-a-cocher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { Textarea } from "@/components/ui/textarea";
import type { Comparaison } from "@/lib/calculs/etat-des-lieux";
import { compresserImage } from "@/lib/compression-image";
import { centimesVersSaisie, formatEuros, formatNombre, parseEurosEnCentimes } from "@/lib/format";
import { COULEURS_GRAVITE, LIBELLES_GRAVITE, libelleDommage, type Gravite, type TypeDommage, type Vue } from "@/lib/schema-vehicule";
import { cn } from "@/lib/utils";
import {
  DECISIONS_CAUTION,
  LIBELLES_PROPRETE,
  LIBELLES_TYPE_FRAIS,
  PHOTOS_GUIDEES,
  PROPRETES,
  TYPES_FRAIS,
  type SaisieEtatDesLieux,
} from "@/lib/validations/etat-des-lieux";
import { apercuComparaison, envoyerPhotoEdl, supprimerDommage, supprimerPhotoEdl, validerEtatDesLieux } from "@/server/actions/etats-des-lieux";
import { DialogueDommage, type PointTouche } from "./dialogue-dommage";
import { PadSignature, type PadSignatureRef } from "./pad-signature";
import { SchemaVehicule } from "./schema-vehicule";

type Proprete = (typeof PROPRETES)[number];
type Photo = { id: string; categorie: string };
type Dommage = { id: string; vue: Vue; zone: string; positionX: number | null; positionY: number | null; type: TypeDommage; gravite: Gravite; nouveau: boolean };
type LigneChecklist = { elementId: string | null; libelle: string; present: boolean; quantite: number | null };
type LigneFrais = { type: (typeof TYPES_FRAIS)[number]; libelle: string; quantite: string; prixUnitaire: string; dommageId: string | null };

export type PropsAssistant = {
  type: "DEPART" | "RETOUR";
  edlId: string;
  contrat: { id: string; numero: string; vehiculeId: string; nomVehicule: string; nomClient: string; cautionCentimes: number; statutCaution: string; prixTotalCentimes: number; encaisseCentimes: number };
  kmReference: number | null;
  depart: { kilometrage: number; niveauCarburantHuitiemes: number | null; niveauBatteriePct: number | null } | null;
  mesures: { carburant: boolean; batterie: boolean };
  checklist: LigneChecklist[];
  photos: Photo[];
  dommages: Dommage[];
};

const RETENUES: Record<(typeof DECISIONS_CAUTION)[number], string> = {
  RESTITUEE: "Restituer en totalité",
  RETENUE_PARTIELLE: "Retenir une partie",
  RETENUE_TOTALE: "Retenir en totalité",
};

export function AssistantEtatDesLieux(p: PropsAssistant) {
  const router = useRouter();
  const retour = p.type === "RETOUR";
  const etapes = retour
    ? ["Compteur", "Propreté et équipements", "Dommages", "Photos", "Frais et caution", "Signatures"]
    : ["Compteur", "Propreté et équipements", "Dommages", "Photos", "Signatures"];
  const [etape, setEtape] = useState(0);

  // --- Relevés ---
  const [km, setKm] = useState(p.kmReference !== null ? String(p.kmReference) : "");
  const [carburant, setCarburant] = useState<number | null>(retour ? null : null);
  const [batterie, setBatterie] = useState("");
  const [proprInt, setProprInt] = useState<Proprete | null>(null);
  const [proprExt, setProprExt] = useState<Proprete | null>(null);
  const [checklist, setChecklist] = useState<LigneChecklist[]>(p.checklist);
  const [photos, setPhotos] = useState<Photo[]>(p.photos);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [dommages, setDommages] = useState<Dommage[]>(p.dommages);
  const [point, setPoint] = useState<PointTouche | null>(null);
  // --- Retour : frais et caution ---
  const [comparaison, setComparaison] = useState<Comparaison | null>(null);
  const [frais, setFrais] = useState<LigneFrais[] | null>(null);
  const [decision, setDecision] = useState<(typeof DECISIONS_CAUTION)[number] | null>(null);
  const [montantRetenu, setMontantRetenu] = useState("");
  const [motifRetenue, setMotifRetenue] = useState("");
  // --- Signatures ---
  const [remarques, setRemarques] = useState("");
  const [signataire, setSignataire] = useState(p.contrat.nomClient);
  const [cautionEncaissee, setCautionEncaissee] = useState(p.contrat.cautionCentimes > 0 && p.contrat.statutCaution === "A_ENCAISSER");
  const sigClient = useRef<PadSignatureRef>(null);
  const sigLoueur = useRef<PadSignatureRef>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const kmNombre = Number(km.replace(/\s/g, ""));
  const photo = (categorie: string) => photos.find((x) => x.categorie === categorie);
  const releve = () => ({
    kilometrage: kmNombre,
    niveauCarburantHuitiemes: p.mesures.carburant ? carburant : null,
    niveauBatteriePct: p.mesures.batterie && batterie !== "" ? Number(batterie) : null,
    propreteInterieure: proprInt,
    propreteExterieure: proprExt,
    checklist: checklist.map((l) => ({ libelle: l.libelle, present: l.present, quantite: l.quantite })),
  });

  // --- Photos : envoyées tout de suite ---
  const envoyerPhoto = async (categorie: string, fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoi(categorie);
    const f = new FormData();
    f.set("etatDesLieuxId", p.edlId);
    f.set("categorie", categorie);
    f.set("photo", await compresserImage(fichier));
    const r = await envoyerPhotoEdl(f);
    setEnvoi(null);
    if (traiterResultat(r) && r.donnees) {
      const nouvelle = r.donnees;
      setPhotos((l) => [...(categorie === "EDL_LIBRE" ? l : l.filter((x) => x.categorie !== categorie)), nouvelle]);
    }
  };

  // --- Contrôles avant de passer à l'étape suivante ---
  const controler = (): string | null => {
    const nom = etapes[etape];
    if (nom === "Compteur") {
      if (!photo("EDL_COMPTEUR")) return "Prenez la photo du compteur.";
      if (!km.trim() || !Number.isInteger(kmNombre) || kmNombre < 0) return "Indiquez le kilométrage.";
      if (retour && p.depart && kmNombre < p.depart.kilometrage) return `Le kilométrage ne peut pas être inférieur à celui du départ (${formatNombre(p.depart.kilometrage)} km).`;
      if (p.mesures.carburant && carburant === null) return "Indiquez le niveau de carburant.";
      if (p.mesures.batterie && (batterie === "" || Number(batterie) < 0 || Number(batterie) > 100)) return "Indiquez le niveau de batterie (0 à 100 %).";
    }
    if (nom === "Propreté et équipements" && (!proprInt || !proprExt)) return "Indiquez la propreté intérieure et extérieure.";
    if (nom === "Photos") {
      const manquantes = PHOTOS_GUIDEES.filter((g) => !photo(g.categorie)).map((g) => g.libelle.toLowerCase());
      if (manquantes.length) return `Photos manquantes : ${manquantes.join(", ")}.`;
    }
    return null;
  };

  const suivant = async () => {
    const probleme = controler();
    if (probleme) {
      toast.error(probleme);
      return;
    }
    const prochaine = etape + 1;
    // Entrée dans « Frais et caution » : comparaison calculée par le serveur
    if (retour && etapes[prochaine] === "Frais et caution") {
      const r = await apercuComparaison(p.edlId, releve());
      if (!traiterResultat(r) || !r.donnees) return;
      setComparaison(r.donnees);
      if (frais === null) {
        setFrais(
          r.donnees.fraisProposes.map((f) => ({ type: f.type, libelle: f.libelle, quantite: String(f.quantite), prixUnitaire: centimesVersSaisie(f.prixUnitaireCentimes), dommageId: f.dommageId ?? null })),
        );
      }
    }
    setEtape(prochaine);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalFrais = (frais ?? []).reduce((a, f) => a + (Number(f.quantite) || 0) * (parseEurosEnCentimes(f.prixUnitaire) ?? 0), 0);
  const resteDu = p.contrat.prixTotalCentimes + totalFrais - p.contrat.encaisseCentimes;

  const valider = async () => {
    setErreurs({});
    if (sigClient.current?.vide()) return toast.error("La signature du client est obligatoire.");
    if (sigLoueur.current?.vide()) return toast.error("La signature du loueur est obligatoire.");
    setEnregistrement(true);
    const [fc, fl] = await Promise.all([sigClient.current!.versFichier("signature-client.png"), sigLoueur.current!.versFichier("signature-loueur.png")]);
    const signatures = new FormData();
    if (fc) signatures.set("signatureClient", fc);
    if (fl) signatures.set("signatureLoueur", fl);
    const r0 = releve();
    const saisie: SaisieEtatDesLieux = {
      kilometrage: km,
      niveauCarburantHuitiemes: r0.niveauCarburantHuitiemes,
      niveauBatteriePct: p.mesures.batterie ? batterie : "",
      propreteInterieure: proprInt ?? "",
      propreteExterieure: proprExt ?? "",
      checklist,
      remarques,
      nomSignataireClient: signataire,
      cautionEncaissee,
      frais: (frais ?? []).map((f) => ({ ...f })),
      decisionCaution: retour && p.contrat.cautionCentimes > 0 ? decision : null,
      montantRetenu,
      motifRetenue,
    } as SaisieEtatDesLieux;
    const r = await validerEtatDesLieux(p.edlId, saisie, signatures);
    setEnregistrement(false);
    if (traiterResultat(r)) {
      router.push(`/location/contrats/${p.contrat.id}`);
      router.refresh();
    } else if (!r.ok && r.erreursChamps) {
      setErreurs(Object.fromEntries(Object.entries(r.erreursChamps).map(([k, v]) => [k, v?.[0] ?? ""])));
      const k = Object.keys(r.erreursChamps)[0] ?? "";
      if (k === "kilometrage") setEtape(0);
      else if (["decisionCaution", "montantRetenu", "motifRetenue"].includes(k) || k.startsWith("frais")) setEtape(etapes.indexOf("Frais et caution"));
    }
  };

  const numeros = new Map(dommages.map((d, i) => [d.id, i + 1]));
  const nomEtape = etapes[etape];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-32">
      {/* Progression */}
      <div>
        <div className="flex gap-1" aria-hidden>
          {etapes.map((e, i) => (
            <span key={e} className={cn("h-1.5 flex-1 rounded-full", i <= etape ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <h2 className="mt-3 text-lg font-semibold">
          {etape + 1}/{etapes.length} · {nomEtape}
        </h2>
      </div>

      {/* ---------------- Compteur ---------------- */}
      {nomEtape === "Compteur" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Compteur</CardTitle>
              <CardDescription>
                {retour && p.depart
                  ? `Au départ : ${formatNombre(p.depart.kilometrage)} km.`
                  : p.kmReference !== null
                    ? `Dernier relevé connu : ${formatNombre(p.kmReference)} km.`
                    : "Photo du compteur obligatoire."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <EmplacementPhoto libelle="Photo du compteur" categorie="EDL_COMPTEUR" photo={photo("EDL_COMPTEUR")} envoi={envoi} onPhoto={envoyerPhoto} grand />
              <Champ label="Kilométrage" htmlFor="kilometrage" obligatoire erreur={erreurs.kilometrage}>
                <Input id="kilometrage" inputMode="numeric" className="h-14 text-2xl font-semibold tabular-nums" value={km} onChange={(e) => setKm(e.target.value)} />
              </Champ>
              {retour && p.depart && Number.isInteger(kmNombre) && kmNombre >= p.depart.kilometrage && (
                <p className="text-sm">
                  Parcourus : <strong>{formatNombre(kmNombre - p.depart.kilometrage)} km</strong>
                </p>
              )}
            </CardContent>
          </Card>
          {p.mesures.carburant && (
            <Card>
              <CardHeader>
                <CardTitle>Carburant</CardTitle>
                {retour && p.depart?.niveauCarburantHuitiemes != null && <CardDescription>Au départ : {p.depart.niveauCarburantHuitiemes}/8</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-9 gap-1" role="radiogroup" aria-label="Niveau de carburant">
                  {Array.from({ length: 9 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={carburant === n}
                      aria-label={`${n}/8`}
                      onClick={() => setCarburant(n)}
                      className={cn("flex h-16 flex-col items-center justify-end gap-1 rounded-md border pb-1 text-xs", carburant === n ? "border-primary ring-1 ring-primary" : "hover:bg-accent")}
                    >
                      <span className={cn("w-3 rounded-sm", carburant !== null && n <= carburant ? "bg-primary" : "bg-muted")} style={{ height: `${4 + n * 4}px` }} />
                      {n}/8
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">{carburant === null ? "Touchez le niveau de la jauge." : carburant === 8 ? "Plein" : carburant === 0 ? "Réserve / vide" : `${carburant}/8`}</p>
              </CardContent>
            </Card>
          )}
          {p.mesures.batterie && (
            <Card>
              <CardHeader>
                <CardTitle>Batterie</CardTitle>
                {retour && p.depart?.niveauBatteriePct != null && <CardDescription>Au départ : {p.depart.niveauBatteriePct} %</CardDescription>}
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <input type="range" min={0} max={100} step={1} value={batterie === "" ? 50 : Number(batterie)} onChange={(e) => setBatterie(e.target.value)} className="flex-1 accent-primary" aria-label="Niveau de batterie" />
                <div className="relative w-24">
                  <Input inputMode="numeric" value={batterie} onChange={(e) => setBatterie(e.target.value.replace(/\D/g, "").slice(0, 3))} className="pr-7 text-right" aria-label="Batterie en %" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ---------------- Propreté et check-list ---------------- */}
      {nomEtape === "Propreté et équipements" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Propreté</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(
                [
                  ["Intérieur", proprInt, setProprInt],
                  ["Extérieur", proprExt, setProprExt],
                ] as const
              ).map(([libelle, valeur, changer]) => (
                <div key={libelle}>
                  <p className="mb-2 text-sm font-medium">{libelle}</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={`Propreté ${libelle.toLowerCase()}`}>
                    {PROPRETES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={valeur === v}
                        onClick={() => changer(v)}
                        className={cn(
                          "h-12 rounded-lg border text-sm font-medium",
                          valeur === v ? (v === "SALE" ? "border-destructive bg-destructive text-white" : "border-primary bg-primary text-primary-foreground") : "hover:bg-accent",
                        )}
                      >
                        {LIBELLES_PROPRETE[v]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Équipements</CardTitle>
              <CardDescription>{retour ? "Décochez ce qui manque au retour." : "Décochez ce qui n'est pas dans le véhicule."}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {checklist.map((l, i) => (
                  <li key={l.libelle} className="flex items-center gap-3 py-2.5">
                    <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                      <CaseACocher checked={l.present} onChange={(e) => setChecklist((c) => c.map((x, j) => (j === i ? { ...x, present: e.target.checked } : x)))} />
                      <span className={cn(!l.present && "text-muted-foreground line-through")}>{l.libelle}</span>
                    </label>
                    {l.quantite !== null && l.present && (
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="icon" className="size-9" aria-label={`Moins de ${l.libelle}`} onClick={() => setChecklist((c) => c.map((x, j) => (j === i ? { ...x, quantite: Math.max(0, (x.quantite ?? 1) - 1) } : x)))}>
                          <Minus />
                        </Button>
                        <span className="w-6 text-center font-semibold tabular-nums">{l.quantite}</span>
                        <Button type="button" variant="outline" size="icon" className="size-9" aria-label={`Plus de ${l.libelle}`} onClick={() => setChecklist((c) => c.map((x, j) => (j === i ? { ...x, quantite: Math.min(20, (x.quantite ?? 0) + 1) } : x)))}>
                          <Plus />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
                {checklist.length === 0 && <li className="py-3 text-sm text-muted-foreground">Aucun élément (Réglages → Check-list).</li>}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* ---------------- Dommages ---------------- */}
      {nomEtape === "Dommages" && (
        <Card>
          <CardHeader>
            <CardTitle>Dommages</CardTitle>
            <CardDescription>
              Les dommages déjà connus du véhicule sont reportés. Touchez le schéma pour en ajouter un{retour ? " (il sera signalé comme nouveau)" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SchemaVehicule
              dommages={dommages.map((d) => ({ ...d, numero: numeros.get(d.id) ?? 0 }))}
              onToucher={(vue, zone, x, y) => setPoint({ vue, zone, x, y })}
            />
            {dommages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dommage connu sur ce véhicule.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {dommages.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: COULEURS_GRAVITE[d.gravite] }}>
                      {numeros.get(d.id)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium">{libelleDommage(d)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {LIBELLES_GRAVITE[d.gravite]}
                        {d.nouveau ? " · ajouté maintenant" : " · déjà connu"}
                      </span>
                    </span>
                    {d.nouveau && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label="Supprimer ce dommage"
                        onClick={async () => {
                          if (traiterResultat(await supprimerDommage(d.id))) setDommages((l) => l.filter((x) => x.id !== d.id));
                        }}
                      >
                        <Trash />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------- Photos ---------------- */}
      {nomEtape === "Photos" && (
        <Card>
          <CardHeader>
            <CardTitle>Photos du véhicule</CardTitle>
            <CardDescription>Les 6 vues sont obligatoires. Ajoutez des photos libres pour tout détail utile.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PHOTOS_GUIDEES.map((g) => (
                <EmplacementPhoto key={g.categorie} libelle={g.libelle} categorie={g.categorie} photo={photo(g.categorie)} envoi={envoi} onPhoto={envoyerPhoto} />
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Photos libres</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos
                  .filter((x) => x.categorie === "EDL_LIBRE")
                  .map((x) => (
                    <div key={x.id} className="relative overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/fichiers/${x.id}?taille=mini`} alt="Photo libre" className="aspect-square w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Supprimer la photo"
                        onClick={async () => {
                          if (traiterResultat(await supprimerPhotoEdl(x.id))) setPhotos((l) => l.filter((y) => y.id !== x.id));
                        }}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                      >
                        <Trash className="size-3.5" />
                      </button>
                    </div>
                  ))}
                <EmplacementPhoto libelle="Ajouter" categorie="EDL_LIBRE" photo={undefined} envoi={envoi} onPhoto={envoyerPhoto} compact />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------- Frais et caution (retour) ---------------- */}
      {nomEtape === "Frais et caution" && comparaison && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Comparaison départ / retour</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Indicateur libelle="Km parcourus" valeur={`${formatNombre(comparaison.kmParcourus)} km`} detail={comparaison.kmInclus === null ? "kilométrage illimité" : `${formatNombre(comparaison.kmInclus)} km inclus`} />
                <Indicateur libelle="Km supplémentaires" valeur={`${formatNombre(comparaison.kmSupplementaires)} km`} alerte={comparaison.kmSupplementaires > 0} />
                {p.mesures.carburant && <Indicateur libelle="Carburant manquant" valeur={`${comparaison.carburantManquantHuitiemes}/8`} alerte={comparaison.carburantManquantHuitiemes > 0} />}
                {p.mesures.batterie && <Indicateur libelle="Batterie manquante" valeur={`${comparaison.batterieManquantePct} %`} alerte={comparaison.batterieManquantePct > 0} />}
                <Indicateur
                  libelle="Retard"
                  valeur={comparaison.joursRetard > 0 ? `${comparaison.joursRetard} jour${comparaison.joursRetard > 1 ? "s" : ""}` : "Aucun"}
                  detail={comparaison.retardMinutes > 0 ? `${Math.floor(comparaison.retardMinutes / 60)} h ${comparaison.retardMinutes % 60} min après l'heure prévue` : undefined}
                  alerte={comparaison.joursRetard > 0}
                />
                <Indicateur libelle="Propreté" valeur={comparaison.salete ? "Rendu sale" : "Conforme"} alerte={comparaison.salete} />
                <Indicateur libelle="Nouveaux dommages" valeur={String(comparaison.nouveauxDommages.length)} alerte={comparaison.nouveauxDommages.length > 0} />
              </dl>
              {comparaison.nouveauxDommages.length > 0 && (
                <ul className="mt-3 list-inside list-disc text-sm text-destructive">
                  {comparaison.nouveauxDommages.map((d) => (
                    <li key={d.id}>{d.libelle}</li>
                  ))}
                </ul>
              )}
              {comparaison.elementsManquants.length > 0 && <p className="mt-2 text-sm text-destructive">Manquant : {comparaison.elementsManquants.join(", ")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frais supplémentaires</CardTitle>
              <CardDescription>Proposés automatiquement : vérifiez, modifiez ou supprimez. Les dommages sont à chiffrer.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(frais ?? []).map((f, i) => {
                const maj = (modif: Partial<LigneFrais>) => setFrais((l) => (l ?? []).map((x, j) => (j === i ? { ...x, ...modif } : x)));
                const total = (Number(f.quantite) || 0) * (parseEurosEnCentimes(f.prixUnitaire) ?? 0);
                return (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border p-3">
                    <Input aria-label="Libellé du frais" value={f.libelle} onChange={(e) => maj({ libelle: e.target.value })} className="col-span-2 font-medium" />
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                      <Input aria-label="Quantité" inputMode="numeric" value={f.quantite} onChange={(e) => maj({ quantite: e.target.value.replace(/\D/g, "") })} className="text-right" />
                      <ChampMontant aria-label="Prix unitaire" value={f.prixUnitaire} onChange={(e) => maj({ prixUnitaire: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-24 text-right font-semibold tabular-nums">{formatEuros(total)}</span>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" aria-label="Retirer ce frais" onClick={() => setFrais((l) => (l ?? []).filter((_, j) => j !== i))}>
                        <Trash />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(frais ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun frais : le véhicule est rendu conforme.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <SelectNatif
                  aria-label="Ajouter un frais"
                  value=""
                  onChange={(e) => {
                    const t = e.target.value as LigneFrais["type"];
                    if (t) setFrais((l) => [...(l ?? []), { type: t, libelle: LIBELLES_TYPE_FRAIS[t], quantite: "1", prixUnitaire: "", dommageId: null }]);
                  }}
                  className="min-w-0 flex-1"
                >
                  <option value="">+ Ajouter un frais…</option>
                  {TYPES_FRAIS.map((t) => (
                    <option key={t} value={t}>
                      {LIBELLES_TYPE_FRAIS[t]}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <dl className="mt-2 flex flex-col gap-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <dt>Location</dt>
                  <dd className="tabular-nums">{formatEuros(p.contrat.prixTotalCentimes)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Frais supplémentaires</dt>
                  <dd className="tabular-nums">{formatEuros(totalFrais)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Déjà encaissé</dt>
                  <dd className="tabular-nums">− {formatEuros(p.contrat.encaisseCentimes)}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Reste à payer</dt>
                  <dd className="tabular-nums">{formatEuros(resteDu)}</dd>
                </div>
                <p className="text-xs text-muted-foreground">Le solde s&apos;encaisse ensuite depuis la fiche du contrat (« Encaisser un paiement »).</p>
              </dl>
            </CardContent>
          </Card>

          {p.contrat.cautionCentimes > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Caution : {formatEuros(p.contrat.cautionCentimes)}</CardTitle>
                <CardDescription>La part retenue compte dans les revenus du véhicule.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Caution">
                  {DECISIONS_CAUTION.map((dc) => (
                    <button
                      key={dc}
                      type="button"
                      role="radio"
                      aria-checked={decision === dc}
                      onClick={() => {
                        setDecision(dc);
                        if (dc === "RETENUE_PARTIELLE" && !montantRetenu && totalFrais > 0) setMontantRetenu(centimesVersSaisie(Math.min(totalFrais, p.contrat.cautionCentimes)));
                      }}
                      className={cn("h-12 rounded-lg border px-3 text-sm font-medium", decision === dc ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
                    >
                      {RETENUES[dc]}
                    </button>
                  ))}
                </div>
                {erreurs.decisionCaution && <p className="text-sm text-destructive">{erreurs.decisionCaution}</p>}
                {decision === "RETENUE_PARTIELLE" && (
                  <Champ label="Montant retenu" htmlFor="montantRetenu" erreur={erreurs.montantRetenu} aide={totalFrais > 0 ? `Frais supplémentaires : ${formatEuros(totalFrais)}` : undefined}>
                    <ChampMontant id="montantRetenu" value={montantRetenu} onChange={(e) => setMontantRetenu(e.target.value)} />
                  </Champ>
                )}
                {decision && decision !== "RESTITUEE" && (
                  <Champ label="Motif de la retenue" htmlFor="motifRetenue" erreur={erreurs.motifRetenue} obligatoire>
                    <Input id="motifRetenue" value={motifRetenue} onChange={(e) => setMotifRetenue(e.target.value)} placeholder="Ex. : rayure porte avant + carburant" />
                  </Champ>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ---------------- Signatures ---------------- */}
      {nomEtape === "Signatures" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
              <CardDescription>
                {p.contrat.numero} · {p.contrat.nomVehicule}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p>
                {formatNombre(kmNombre)} km
                {p.mesures.carburant && carburant !== null && ` · carburant ${carburant}/8`}
                {p.mesures.batterie && batterie !== "" && ` · batterie ${batterie} %`}
                {proprInt && ` · intérieur ${LIBELLES_PROPRETE[proprInt].toLowerCase()}`}
                {proprExt && ` · extérieur ${LIBELLES_PROPRETE[proprExt].toLowerCase()}`}
              </p>
              <p>
                {dommages.length} dommage{dommages.length > 1 ? "s" : ""} ({dommages.filter((d) => d.nouveau).length} nouveau{dommages.filter((d) => d.nouveau).length > 1 ? "x" : ""}) ·{" "}
                {photos.length} photo{photos.length > 1 ? "s" : ""}
                {checklist.some((l) => !l.present) && ` · manquant : ${checklist.filter((l) => !l.present).map((l) => l.libelle).join(", ")}`}
              </p>
              {retour && (
                <p>
                  Frais : <strong>{formatEuros(totalFrais)}</strong>
                  {p.contrat.cautionCentimes > 0 && decision && ` · caution : ${RETENUES[decision].toLowerCase()}`}
                </p>
              )}
              <Champ label="Remarques" htmlFor="remarques">
                <Textarea id="remarques" rows={2} value={remarques} onChange={(e) => setRemarques(e.target.value)} />
              </Champ>
              {!retour && p.contrat.cautionCentimes > 0 && p.contrat.statutCaution === "A_ENCAISSER" && (
                <label className="flex items-start gap-3 rounded-lg border p-3">
                  <CaseACocher className="mt-0.5" checked={cautionEncaissee} onChange={(e) => setCautionEncaissee(e.target.checked)} />
                  <span>
                    <span className="font-medium">Caution de {formatEuros(p.contrat.cautionCentimes)} reçue</span>
                    <span className="block text-xs text-muted-foreground">Empreinte, chèque ou espèces remis au départ.</span>
                  </span>
                </label>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Signatures</CardTitle>
              <CardDescription>
                {retour ? "Le client confirme l'état du véhicule au retour." : "En signant, le client accepte l'état du véhicule et le contrat de location."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Champ label="Nom du signataire (client)" htmlFor="signataire" erreur={erreurs.nomSignataireClient} obligatoire>
                <Input id="signataire" value={signataire} onChange={(e) => setSignataire(e.target.value)} />
              </Champ>
              <PadSignature ref={sigClient} libelle="Signature du client" />
              <PadSignature ref={sigLoueur} libelle="Signature du loueur (VUCA AUTO)" />
            </CardContent>
          </Card>
        </>
      )}

      {point && (
        <DialogueDommage
          point={point}
          vehiculeId={p.contrat.vehiculeId}
          etatDesLieuxId={p.edlId}
          onFermer={() => setPoint(null)}
          onAjoute={(d) => setDommages((l) => [...l, { ...d, nouveau: true }])}
        />
      )}

      {/* Barre d'actions — clés distinctes (voir CLAUDE.md : piège React) */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {etape === 0 ? (
            <Button key="quitter" variant="outline" asChild className="mr-auto">
              <Link href={`/location/contrats/${p.contrat.id}`}>Quitter</Link>
            </Button>
          ) : (
            <Button key="precedent" type="button" variant="outline" className="mr-auto" onClick={() => setEtape((e) => e - 1)}>
              <ChevronLeft /> Retour
            </Button>
          )}
          {etape < etapes.length - 1 ? (
            <Button key="suivant" type="button" onClick={suivant}>
              Suivant <ChevronRight />
            </Button>
          ) : (
            <Button key="valider" type="button" onClick={valider} disabled={enregistrement}>
              {enregistrement && <LoaderCircle className="animate-spin" />}
              {retour ? "Valider le retour" : "Valider le départ"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Indicateur({ libelle, valeur, detail, alerte }: { libelle: string; valeur: string; detail?: string; alerte?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", alerte && "border-destructive/50 bg-destructive/5")}>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {alerte && <TriangleAlert className="size-3 text-destructive" />} {libelle}
      </dt>
      <dd className={cn("font-semibold tabular-nums", alerte && "text-destructive")}>{valeur}</dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
}

/** Emplacement de photo : appareil photo du téléphone, aperçu, reprise. */
function EmplacementPhoto({
  libelle,
  categorie,
  photo,
  envoi,
  onPhoto,
  grand,
  compact,
}: {
  libelle: string;
  categorie: string;
  photo: Photo | undefined;
  envoi: string | null;
  onPhoto: (categorie: string, f: File | undefined) => void;
  grand?: boolean;
  compact?: boolean;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const enCours = envoi === categorie;
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={champ}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={`Photo ${libelle}`}
        data-categorie={categorie}
        onChange={(e) => {
          onPhoto(categorie, e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={enCours}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border-2 text-sm",
          grand ? "aspect-[16/9]" : compact ? "aspect-square" : "aspect-[4/3]",
          photo ? "border-success/60" : "border-dashed text-muted-foreground hover:border-primary hover:text-primary",
        )}
      >
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/fichiers/${photo.id}?taille=mini`} alt={libelle} className="absolute inset-0 size-full object-cover" />
            <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              <RefreshCw className="size-3" /> Reprendre
            </span>
          </>
        ) : enCours ? (
          <LoaderCircle className="size-6 animate-spin" />
        ) : (
          <span className="flex flex-col items-center gap-1">
            <Camera className={grand ? "size-8" : "size-6"} />
            {compact ? libelle : `Photo ${libelle.toLowerCase()}`}
          </span>
        )}
      </button>
      {!compact && <span className="text-center text-xs font-medium">{libelle}</span>}
    </div>
  );
}
