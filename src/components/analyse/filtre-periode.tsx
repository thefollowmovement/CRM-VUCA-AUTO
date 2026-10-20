"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { LIBELLES_PERIODE, PERIODES, type TypePeriode } from "@/lib/calculs/periode";
import { cn } from "@/lib/utils";

/** Filtre de période (ce mois, mois dernier, trimestre, année, personnalisée) + partenaire, dans l'URL. */
export function FiltrePeriode({
  periode,
  du,
  au,
  partenaire,
  partenaires,
}: {
  periode: TypePeriode;
  du: string;
  au: string;
  partenaire?: string;
  partenaires?: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [debut, setDebut] = useState(du);
  const [fin, setFin] = useState(au);
  const aller = (modifs: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(modifs)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${chemin}?${p.toString()}`, { scroll: false });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Période">
          {PERIODES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => aller(p === "perso" ? { periode: p, du: debut, au: fin } : { periode: p === "mois" ? null : p, du: null, au: null })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                periode === p ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent",
              )}
              aria-pressed={periode === p}
            >
              {LIBELLES_PERIODE[p]}
            </button>
          ))}
        </div>
        {partenaires && (
          <SelectNatif
            aria-label="Partenaire"
            className="w-full sm:ml-auto sm:w-56"
            value={partenaire ?? ""}
            onChange={(e) => aller({ partenaire: e.target.value || null })}
          >
            <option value="">Tous les partenaires</option>
            {partenaires.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </SelectNatif>
        )}
      </div>
      {periode === "perso" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            aller({ periode: "perso", du: debut, au: fin });
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Du
            <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="w-40" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Au
            <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="w-40" />
          </label>
          <Button type="submit" variant="outline">
            Appliquer
          </Button>
        </form>
      )}
    </div>
  );
}
