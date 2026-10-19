"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RechercheUrl } from "@/components/ui/recherche-url";
import { SelectNatif } from "@/components/ui/select-natif";
import { LIBELLES_STATUT_CONTRAT } from "@/lib/contrat";

const CLES = ["statut", "vehicule", "du", "au", "q", "archives"];

export function FiltresContrats({ vehicules }: { vehicules: { id: string; libelle: string }[] }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const appliquer = (modifs: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modifs)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`${chemin}?${p.toString()}`, { scroll: false });
  };
  const actifs = CLES.some((k) => params.get(k));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <RechercheUrl placeholder="N° de contrat, client, immatriculation…" libelle="Rechercher un contrat" />
        {actifs && (
          <Button variant="ghost" onClick={() => appliquer(Object.fromEntries(CLES.map((k) => [k, ""])))}>
            <X /> Effacer
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Champ label="Statut" htmlFor="f-statut">
          <SelectNatif id="f-statut" value={params.get("statut") ?? ""} onChange={(e) => appliquer({ statut: e.target.value })}>
            <option value="">Tous</option>
            {Object.entries(LIBELLES_STATUT_CONTRAT).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectNatif>
        </Champ>
        <Champ label="Véhicule" htmlFor="f-vehicule">
          <SelectNatif id="f-vehicule" value={params.get("vehicule") ?? ""} onChange={(e) => appliquer({ vehicule: e.target.value })}>
            <option value="">Tous</option>
            {vehicules.map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </SelectNatif>
        </Champ>
        <Champ label="Du" htmlFor="f-du">
          <Input id="f-du" type="date" value={params.get("du") ?? ""} onChange={(e) => appliquer({ du: e.target.value })} />
        </Champ>
        <Champ label="Au" htmlFor="f-au">
          <Input id="f-au" type="date" value={params.get("au") ?? ""} onChange={(e) => appliquer({ au: e.target.value })} />
        </Champ>
        <Champ label="Affichage" htmlFor="f-archives" className="col-span-2 md:col-span-1">
          <SelectNatif id="f-archives" value={params.get("archives") ?? ""} onChange={(e) => appliquer({ archives: e.target.value })}>
            <option value="">Contrats actifs</option>
            <option value="1">Archivés</option>
          </SelectNatif>
        </Champ>
      </div>
    </div>
  );
}
