"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Champ } from "@/components/formulaires/champ";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { LIBELLES_STATUT, LIBELLES_TYPE } from "@/lib/vehicule";

const CLES_FILTRES = ["statut", "type", "financeur", "marque", "du", "au"] as const;

export function FiltresVehicules({
  marques,
  financeurs,
}: {
  marques: string[];
  financeurs: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [recherche, setRecherche] = useState(params.get("q") ?? "");
  const [ouvert, setOuvert] = useState(false);

  const appliquer = (modifs: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modifs)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`${chemin}?${p.toString()}`, { scroll: false });
  };

  // Recherche 300 ms après la dernière frappe
  useEffect(() => {
    if (recherche === (params.get("q") ?? "")) return;
    const t = setTimeout(() => appliquer({ q: recherche.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  const actifs = CLES_FILTRES.filter((k) => params.get(k)).length;

  const champs = (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Champ label="Statut" htmlFor="f-statut">
        <SelectNatif id="f-statut" value={params.get("statut") ?? ""} onChange={(e) => appliquer({ statut: e.target.value })}>
          <option value="">Tous</option>
          {Object.entries(LIBELLES_STATUT).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </SelectNatif>
      </Champ>
      <Champ label="Exploitation" htmlFor="f-type">
        <SelectNatif id="f-type" value={params.get("type") ?? ""} onChange={(e) => appliquer({ type: e.target.value })}>
          <option value="">Toutes</option>
          {Object.entries(LIBELLES_TYPE).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </SelectNatif>
      </Champ>
      <Champ label="Financeur" htmlFor="f-financeur">
        <SelectNatif id="f-financeur" value={params.get("financeur") ?? ""} onChange={(e) => appliquer({ financeur: e.target.value })}>
          <option value="">Tous</option>
          {financeurs.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </SelectNatif>
      </Champ>
      <Champ label="Marque" htmlFor="f-marque">
        <SelectNatif id="f-marque" value={params.get("marque") ?? ""} onChange={(e) => appliquer({ marque: e.target.value })}>
          <option value="">Toutes</option>
          {marques.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </SelectNatif>
      </Champ>
      <Champ label="Acheté du" htmlFor="f-du">
        <Input id="f-du" type="date" value={params.get("du") ?? ""} onChange={(e) => appliquer({ du: e.target.value })} />
      </Champ>
      <Champ label="au" htmlFor="f-au">
        <Input id="f-au" type="date" value={params.get("au") ?? ""} onChange={(e) => appliquer({ au: e.target.value })} />
      </Champ>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Marque, modèle, immatriculation, VIN…"
            className="pl-9"
            aria-label="Rechercher un véhicule"
          />
        </div>
        <Button variant="outline" className="md:hidden" onClick={() => setOuvert(true)}>
          <SlidersHorizontal /> Filtres{actifs > 0 && ` (${actifs})`}
        </Button>
        {actifs > 0 && (
          <Button
            variant="ghost"
            className="hidden md:inline-flex"
            onClick={() => appliquer(Object.fromEntries(CLES_FILTRES.map((k) => [k, ""])))}
          >
            <X /> Effacer les filtres
          </Button>
        )}
      </div>
      <div className="hidden md:block">{champs}</div>
      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent>
          <DialogTitle>Filtres</DialogTitle>
          {champs}
          <DialogFooter>
            <Button variant="outline" onClick={() => appliquer(Object.fromEntries(CLES_FILTRES.map((k) => [k, ""])))}>
              Effacer
            </Button>
            <Button onClick={() => setOuvert(false)}>Voir les résultats</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
