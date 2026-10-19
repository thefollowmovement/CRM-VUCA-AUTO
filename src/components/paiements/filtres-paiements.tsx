"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Champ } from "@/components/formulaires/champ";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { LIBELLES_MODE_PAIEMENT, MODES_PAIEMENT } from "@/lib/validations/finance";

export function FiltresPaiements() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const appliquer = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`${chemin}?${p.toString()}`, { scroll: false });
  };
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Champ label="Du" htmlFor="f-du">
        <Input id="f-du" type="date" value={params.get("du") ?? ""} onChange={(e) => appliquer("du", e.target.value)} />
      </Champ>
      <Champ label="Au" htmlFor="f-au">
        <Input id="f-au" type="date" value={params.get("au") ?? ""} onChange={(e) => appliquer("au", e.target.value)} />
      </Champ>
      <Champ label="Mode" htmlFor="f-mode" className="col-span-2 md:col-span-1">
        <SelectNatif id="f-mode" value={params.get("mode") ?? ""} onChange={(e) => appliquer("mode", e.target.value)}>
          <option value="">Tous</option>
          {MODES_PAIEMENT.map((m) => (
            <option key={m} value={m}>
              {LIBELLES_MODE_PAIEMENT[m]}
            </option>
          ))}
        </SelectNatif>
      </Champ>
    </div>
  );
}
