"use client";

import { CircleAlert, CircleCheck, FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { importerAvis } from "@/server/actions/amendes-import";

// 20 Mo : limite du relais HTTPS (Caddy) du serveur.
const TAILLE_MAX = 20 * 1024 * 1024;
const EXTENSIONS = /\.(pdf|jpe?g|png|heic|heif)$/i;

type Etat = { nom: string; statut: "attente" | "envoi" | "ok" | "erreur"; message?: string };

/**
 * Glisser-déposer des avis scannés (PDF, JPG, PNG, HEIC). Les fichiers partent un par un
 * (aucune limite de taille d'envoi atteinte), dans le même lot ; puis on ouvre le suivi du lot.
 */
export function ZoneDepot() {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [etats, setEtats] = useState<Etat[]>([]);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(liste: File[]) {
    const fichiers = liste.filter((f) => EXTENSIONS.test(f.name) || ["application/pdf", "image/jpeg", "image/png", "image/heic"].includes(f.type));
    if (fichiers.length === 0) {
      toast.error("Formats acceptés : PDF, JPG, PNG ou HEIC.");
      return;
    }
    setEnCours(true);
    setEtats(fichiers.map((f) => ({ nom: f.name, statut: "attente" })));
    let lotId = "";
    let pages = 0;
    for (const [i, f] of fichiers.entries()) {
      const maj = (e: Partial<Etat>) => setEtats((t) => t.map((x, j) => (j === i ? { ...x, ...e } : x)));
      if (f.size > TAILLE_MAX) {
        maj({ statut: "erreur", message: "Trop volumineux (20 Mo maximum) : scannez en plusieurs fichiers." });
        continue;
      }
      maj({ statut: "envoi" });
      const fd = new FormData();
      fd.set("fichier", f);
      if (lotId) fd.set("lotId", lotId);
      try {
        const r = await importerAvis(fd);
        if (r.ok && r.donnees) {
          lotId = r.donnees.lotId;
          pages += r.donnees.pages;
          maj({ statut: "ok", message: `${r.donnees.pages} page${r.donnees.pages > 1 ? "s" : ""}` });
        } else maj({ statut: "erreur", message: r.ok ? "Erreur inattendue." : r.message });
      } catch {
        maj({ statut: "erreur", message: "Envoi interrompu (connexion ?)." });
      }
    }
    setEnCours(false);
    if (lotId) {
      toast.success(`${pages} page${pages > 1 ? "s" : ""} déposée${pages > 1 ? "s" : ""} : lecture en cours.`);
      router.push(`/location/amendes/lots/${lotId}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (!enCours) void envoyer(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          survol ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <FileUp className="size-10 text-primary" aria-hidden />
        <p className="font-medium">Glissez ici les avis de contravention</p>
        <p className="max-w-md text-sm text-muted-foreground">PDF (un scan de plusieurs avis est découpé page par page), JPG, PNG ou photo d&apos;iPhone. 20 Mo maximum par fichier.</p>
        <Button type="button" onClick={() => champ.current?.click()} disabled={enCours}>
          {enCours ? <LoaderCircle className="animate-spin" /> : <FileUp />} Choisir des fichiers
        </Button>
        <input
          ref={champ}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/heic,.heic,.heif"
          className="sr-only"
          aria-label="Avis de contravention à importer"
          onChange={(e) => {
            const f = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (f.length) void envoyer(f);
          }}
        />
      </div>
      {etats.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-live="polite">
          {etats.map((e, i) => (
            <li key={i} className="flex min-w-0 items-center gap-2">
              {e.statut === "ok" ? (
                <CircleCheck className="size-4 shrink-0 text-success" />
              ) : e.statut === "erreur" ? (
                <CircleAlert className="size-4 shrink-0 text-destructive" />
              ) : (
                <LoaderCircle className={cn("size-4 shrink-0 text-muted-foreground", e.statut === "envoi" && "animate-spin")} />
              )}
              <span className="min-w-0 truncate">{e.nom}</span>
              {e.message && <span className={cn("shrink-0", e.statut === "erreur" ? "text-destructive" : "text-muted-foreground")}>— {e.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
