"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Bouton } from "../bouton";
import { ControleSegmente } from "../controle-segmente";
import { FeuilleBas } from "../feuille-bas";
import { PuceFiltre } from "../puce";

const TRIS = [
  { valeur: "recentes", libelle: "Plus récentes" },
  { valeur: "prix-asc", libelle: "Prix croissant" },
  { valeur: "prix-desc", libelle: "Prix décroissant" },
  { valeur: "km", libelle: "Kilométrage" },
] as const;

const champ =
  "s-transition h-12 w-full appearance-none rounded-tuile border border-site-sep bg-site-carte px-4 text-[17px] text-site-texte transition-[border-color,box-shadow] focus:border-site-accent focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--site-accent)_20%,transparent)]";

/** Démonstration : tri (contrôle segmenté), filtres actifs (puces), feuille du bas des filtres. */
export function DemoFiltres({ marques }: { marques: string[] }) {
  const [tri, setTri] = useState<(typeof TRIS)[number]["valeur"]>("recentes");
  const [puces, setPuces] = useState(["Essence", "Moins de 15 000 €", "Automatique"]);
  const [ouverte, setOuverte] = useState(false);
  const [boite, setBoite] = useState("AUTOMATIQUE");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Bouton variante="discret" onClick={() => setOuverte(true)}>
          <SlidersHorizontal strokeWidth={1.5} aria-hidden /> Filtres
        </Bouton>
        <ControleSegmente libelle="Trier par" valeur={tri} onChange={setTri} options={[...TRIS]} />
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filtres actifs">
        {puces.map((p) => (
          <PuceFiltre key={p} libelle={p} onRetirer={() => setPuces(puces.filter((x) => x !== p))} />
        ))}
        {puces.length === 0 && (
          <Bouton variante="secondaire" taille="compact" onClick={() => setPuces(["Essence", "Moins de 15 000 €", "Automatique"])}>
            Remettre les exemples
          </Bouton>
        )}
      </div>
      <FeuilleBas
        ouverte={ouverte}
        onOuverteChange={setOuverte}
        titre="Filtres"
        pied={
          <div className="flex gap-3">
            <Bouton variante="contour" className="flex-1" onClick={() => setOuverte(false)}>
              Effacer
            </Bouton>
            <Bouton className="flex-1" onClick={() => setOuverte(false)}>
              Voir les 8 voitures
            </Bouton>
          </div>
        }
      >
        <form className="flex flex-col gap-5 pt-2" onSubmit={(e) => e.preventDefault()}>
          <label className="flex flex-col gap-2">
            <span className="s-petit font-semibold">Marque</span>
            <select className={champ} defaultValue="">
              <option value="">Toutes les marques</option>
              {marques.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="s-petit font-semibold">Prix maximum</span>
            <select className={champ} defaultValue="15000">
              {[8000, 10000, 15000, 20000, 30000].map((p) => (
                <option key={p} value={p}>
                  {p.toLocaleString("fr-FR")} €
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="s-petit mb-2 font-semibold">Boîte de vitesses</legend>
            <ControleSegmente libelle="Boîte de vitesses" valeur={boite} onChange={setBoite} options={[{ valeur: "TOUTES", libelle: "Toutes" }, { valeur: "MANUELLE", libelle: "Manuelle" }, { valeur: "AUTOMATIQUE", libelle: "Automatique" }]} />
          </fieldset>
        </form>
      </FeuilleBas>
    </div>
  );
}
