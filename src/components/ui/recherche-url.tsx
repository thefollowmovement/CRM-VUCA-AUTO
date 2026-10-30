"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/** Champ de recherche synchronisé avec le paramètre « q » de l'URL (300 ms après la frappe). */
export function RechercheUrl({ placeholder, libelle }: { placeholder: string; libelle: string }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [valeur, setValeur] = useState(params.get("q") ?? "");

  useEffect(() => {
    if (valeur.trim() === (params.get("q") ?? "")) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (valeur.trim()) p.set("q", valeur.trim());
      else p.delete("q");
      router.replace(`${chemin}?${p.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={libelle} />
    </div>
  );
}
