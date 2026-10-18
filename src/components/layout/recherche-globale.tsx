"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { rechercheGlobale, type GroupeResultats } from "@/server/actions/recherche";

/** Recherche globale (immatriculation, VIN, client, n° de contrat…). Raccourci : Ctrl/Cmd + K. */
export function RechercheGlobale() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const [groupes, setGroupes] = useState<GroupeResultats[]>([]);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    const raccourci = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOuvert(true);
      }
    };
    window.addEventListener("keydown", raccourci);
    return () => window.removeEventListener("keydown", raccourci);
  }, []);

  // Recherche 250 ms après la dernière frappe.
  useEffect(() => {
    const q = requete.trim();
    if (q.length < 2) {
      setGroupes([]);
      return;
    }
    const minuterie = setTimeout(() => {
      demarrer(async () => setGroupes(await rechercheGlobale(q)));
    }, 250);
    return () => clearTimeout(minuterie);
  }, [requete]);

  const aller = (href: string) => {
    setOuvert(false);
    setRequete("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs hover:bg-accent md:h-9"
      >
        <Search className="size-4" />
        <span className="truncate">Rechercher…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] font-medium lg:inline">⌘K</kbd>
      </button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="md:top-24 md:translate-y-0">
          <DialogTitle className="sr-only">Recherche</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder="Immatriculation, VIN, client, n° de contrat, partenaire…"
              className="pl-9"
            />
            {enCours && (
              <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="min-h-24">
            {requete.trim().length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tapez au moins 2 caractères.</p>
            ) : groupes.length === 0 && !enCours ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>
            ) : (
              groupes.map((g) => (
                <div key={g.titre} className="mb-3">
                  <p className="mb-1 px-2 text-xs font-medium uppercase text-muted-foreground">{g.titre}</p>
                  {g.resultats.map((r) => (
                    <button
                      key={r.href}
                      type="button"
                      onClick={() => aller(r.href)}
                      className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left hover:bg-accent"
                    >
                      <span className="text-sm font-medium">{r.libelle}</span>
                      {r.detail && <span className="text-xs text-muted-foreground">{r.detail}</span>}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
