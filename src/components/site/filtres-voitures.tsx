"use client";

import { LoaderCircle, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ecrireFiltres, etiquettesFiltres, FILTRES_VIDES, LIBELLES_TRI, TRIS, type Filtres, type optionsFiltres } from "@/lib/site/filtres";
import { cn } from "@/lib/utils";
import { Bouton } from "./bouton";
import { ControleSegmente } from "./controle-segmente";
import { FeuilleBas } from "./feuille-bas";
import { PuceFiltre } from "./puce";

type Options = ReturnType<typeof optionsFiltres>;

export const CLASSE_CHAMP =
  "s-transition h-12 w-full appearance-none rounded-tuile border border-site-sep bg-site-carte bg-[length:16px] bg-[right_14px_center] bg-no-repeat pl-4 pr-10 text-[17px] text-site-texte transition-[border-color,box-shadow] focus:border-site-accent focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--site-accent)_20%,transparent)] md:h-11 md:text-[15px]";
// Chevron de la liste déroulante (gris neutre, lisible en clair et en sombre)
const CHEVRON = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

const nombre = new Intl.NumberFormat("fr-FR");

function Choix({ id, libelle, valeur, onChange, options, tous }: { id: string; libelle: string; valeur: string; onChange: (v: string) => void; options: { valeur: string; libelle: string }[]; tous: string }) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className="s-petit font-semibold">{libelle}</span>
      <select id={id} value={valeur} onChange={(e) => onChange(e.target.value)} className={CLASSE_CHAMP} style={CHEVRON}>
        <option value="">{tous}</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Filtres et tri de la liste : appliqués tout de suite et gardés dans l'adresse (lien partageable).
 * Ordinateur : barre de listes déroulantes. Téléphone : feuille du bas.
 */
export function FiltresVoitures({ filtres, options, nombreResultats, chemin }: { filtres: Filtres; options: Options; nombreResultats: number; /** « /voitures » (ou son équivalent dans l'aperçu) */ chemin: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [ouverte, setOuverte] = useState(false);
  const [f, setF] = useState(filtres);
  // Resynchronise si l'adresse change (bouton retour du navigateur)
  const [vu, setVu] = useState(filtres);
  if (vu !== filtres) {
    setVu(filtres);
    setF(filtres);
  }

  const appliquer = (nouveaux: Filtres) => {
    setF(nouveaux);
    demarrer(() => router.replace(`${chemin}${ecrireFiltres(nouveaux)}`, { scroll: false }));
  };
  const maj = <K extends keyof Filtres>(cle: K, valeur: Filtres[K]) => appliquer({ ...f, [cle]: valeur });
  const texteOuNull = (v: string) => v || null;
  const nombreOuNull = (v: string) => (v ? Number(v) : null);
  const etiquettes = etiquettesFiltres(f);

  const champs = (suffixe: string) => (
    <>
      <Choix id={`marque${suffixe}`} libelle="Marque" tous="Toutes" valeur={f.marque ?? ""} onChange={(v) => maj("marque", texteOuNull(v))} options={options.marques.map((m) => ({ valeur: m, libelle: m }))} />
      <Choix id={`prix${suffixe}`} libelle="Prix maximum" tous="Tous les prix" valeur={f.prixMax ? String(f.prixMax) : ""} onChange={(v) => maj("prixMax", nombreOuNull(v))} options={options.prix.map((p) => ({ valeur: String(p), libelle: `${nombre.format(p)} €` }))} />
      <Choix id={`km${suffixe}`} libelle="Kilométrage maximum" tous="Tous" valeur={f.kmMax ? String(f.kmMax) : ""} onChange={(v) => maj("kmMax", nombreOuNull(v))} options={options.km.map((k) => ({ valeur: String(k), libelle: `${nombre.format(k)} km` }))} />
      <Choix id={`annee${suffixe}`} libelle="Année minimum" tous="Toutes" valeur={f.anneeMin ? String(f.anneeMin) : ""} onChange={(v) => maj("anneeMin", nombreOuNull(v))} options={options.annees.map((a) => ({ valeur: String(a), libelle: String(a) }))} />
      <Choix id={`carburant${suffixe}`} libelle="Carburant" tous="Tous" valeur={f.carburant ?? ""} onChange={(v) => maj("carburant", texteOuNull(v))} options={options.carburants.map((c) => ({ valeur: c, libelle: c }))} />
      <Choix id={`boite${suffixe}`} libelle="Boîte" tous="Toutes" valeur={f.boite ?? ""} onChange={(v) => maj("boite", texteOuNull(v))} options={options.boites.map((b) => ({ valeur: b, libelle: b }))} />
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Ordinateur : barre de filtres */}
      <div className="hidden grid-cols-6 gap-3 md:grid" role="group" aria-label="Filtres">
        {champs("")}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Bouton variante="discret" className="md:hidden" onClick={() => setOuverte(true)}>
          <SlidersHorizontal strokeWidth={1.5} aria-hidden /> Filtres{etiquettes.length > 0 && ` (${etiquettes.length})`}
        </Bouton>
        <ControleSegmente libelle="Trier par" valeur={f.tri} onChange={(t) => maj("tri", t)} options={TRIS.map((t) => ({ valeur: t, libelle: LIBELLES_TRI[t] }))} className="max-md:w-full" />
        <p className={cn("s-petit s-chiffres ml-auto flex items-center gap-2 text-site-2", enCours && "opacity-60")} aria-live="polite">
          {enCours && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {nombreResultats} voiture{nombreResultats > 1 ? "s" : ""}
        </p>
      </div>

      {etiquettes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          {etiquettes.map((e) => (
            <PuceFiltre key={e.cle} libelle={e.libelle} onRetirer={() => maj(e.cle, null)} />
          ))}
          <Bouton variante="secondaire" taille="compact" onClick={() => appliquer({ ...FILTRES_VIDES, tri: f.tri })}>
            Tout effacer
          </Bouton>
        </div>
      )}

      {/* Téléphone : feuille du bas */}
      <FeuilleBas
        ouverte={ouverte}
        onOuverteChange={setOuverte}
        titre="Filtres"
        pied={
          <div className="flex gap-3">
            <Bouton variante="contour" className="flex-1" onClick={() => appliquer({ ...FILTRES_VIDES, tri: f.tri })} disabled={etiquettes.length === 0}>
              Effacer
            </Bouton>
            <Bouton className="flex-1" onClick={() => setOuverte(false)}>
              {enCours ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              Voir {nombreResultats} voiture{nombreResultats > 1 ? "s" : ""}
            </Bouton>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">{champs("-mobile")}</div>
      </FeuilleBas>
    </div>
  );
}
