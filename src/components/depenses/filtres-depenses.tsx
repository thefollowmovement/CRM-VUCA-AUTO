"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";

const CLES = ["vehicule", "categorie", "payeur", "du", "au"] as const;
type Choix = { id: string; libelle: string };

/** Filtres de la liste des dépenses (dans l'URL : partageables, conservés au retour). */
export function FiltresDepenses({ vehicules, categories, payeurs }: { vehicules: Choix[]; categories: Choix[]; payeurs: Choix[] }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [ouvert, setOuvert] = useState(false);

  const appliquer = (modifs: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modifs)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`${chemin}?${p.toString()}`, { scroll: false });
  };
  const actifs = CLES.filter((k) => params.get(k)).length;
  const liste = (cle: string, label: string, tous: string, choix: Choix[]) => (
    <Champ label={label} htmlFor={`f-${cle}`}>
      <SelectNatif id={`f-${cle}`} value={params.get(cle) ?? ""} onChange={(e) => appliquer({ [cle]: e.target.value })}>
        <option value="">{tous}</option>
        {choix.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </SelectNatif>
    </Champ>
  );

  const champs = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {liste("vehicule", "Véhicule", "Tous", vehicules)}
      {liste("categorie", "Catégorie", "Toutes", categories)}
      {liste("payeur", "Payé par", "Tous", payeurs)}
      <Champ label="Du" htmlFor="f-du">
        <Input id="f-du" type="date" value={params.get("du") ?? ""} onChange={(e) => appliquer({ du: e.target.value })} />
      </Champ>
      <Champ label="Au" htmlFor="f-au">
        <Input id="f-au" type="date" value={params.get("au") ?? ""} onChange={(e) => appliquer({ au: e.target.value })} />
      </Champ>
    </div>
  );
  const effacer = () => appliquer(Object.fromEntries(CLES.map((k) => [k, ""])));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 md:hidden">
        <Button variant="outline" onClick={() => setOuvert(true)}>
          <SlidersHorizontal /> Filtres{actifs > 0 && ` (${actifs})`}
        </Button>
        {actifs > 0 && (
          <Button variant="ghost" onClick={effacer}>
            <X /> Effacer
          </Button>
        )}
      </div>
      <div className="hidden items-end gap-2 md:flex">
        <div className="min-w-0 flex-1">{champs}</div>
        {actifs > 0 && (
          <Button variant="ghost" onClick={effacer}>
            <X /> Effacer
          </Button>
        )}
      </div>
      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent>
          <DialogTitle>Filtres</DialogTitle>
          {champs}
          <DialogFooter>
            <Button onClick={() => setOuvert(false)}>Voir les dépenses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
