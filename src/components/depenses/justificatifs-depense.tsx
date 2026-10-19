"use client";

import { Camera, ExternalLink, FileText, LoaderCircle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirmation } from "@/components/ui/confirmation";
import { compresserImage } from "@/lib/compression-image";
import { formatDate } from "@/lib/format";
import { ajouterJustificatif, supprimerJustificatif } from "@/server/actions/depenses";

type Justificatif = { id: string; nomOriginal: string; typeMime: string; creeLe: Date };

/** Tickets / factures d'une dépense : ajout (photo ou PDF), ouverture, suppression. */
export function JustificatifsDepense({ depenseId, justificatifs }: { depenseId: string; justificatifs: Justificatif[] }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnCours(true);
    const f = new FormData();
    f.set("depenseId", depenseId);
    f.set("justificatif", await compresserImage(fichier, 2000, 0.85));
    if (traiterResultat(await ajouterJustificatif(f))) router.refresh();
    if (champ.current) champ.current.value = "";
    setEnCours(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Justificatifs</CardTitle>
          <CardDescription>Ticket, facture (photo ou PDF).</CardDescription>
        </div>
        <input ref={champ} id="ajout-justificatif" type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => envoyer(e.target.files?.[0])} />
        <Button variant="outline" size="sm" disabled={enCours} onClick={() => champ.current?.click()}>
          {enCours ? <LoaderCircle className="animate-spin" /> : <Camera />} Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {justificatifs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun justificatif.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {justificatifs.map((j) => (
              <li key={j.id} className="relative overflow-hidden rounded-lg border">
                <a href={`/api/fichiers/${j.id}`} target="_blank" rel="noopener noreferrer" className="block">
                  {j.typeMime.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/fichiers/${j.id}?taille=mini`} alt={j.nomOriginal} className="aspect-[3/4] w-full object-cover" />
                  ) : (
                    <span className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                      <FileText className="size-8" />
                      <span className="px-2 text-center text-xs">PDF</span>
                    </span>
                  )}
                </a>
                <div className="flex items-center gap-1 border-t px-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{formatDate(j.creeLe)}</span>
                  <Button variant="ghost" size="icon" className="size-8" asChild aria-label="Ouvrir">
                    <a href={`/api/fichiers/${j.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                    </a>
                  </Button>
                  <Confirmation
                    titre="Supprimer ce justificatif ?"
                    libelleConfirmer="Supprimer"
                    onConfirmer={async () => {
                      if (traiterResultat(await supprimerJustificatif(j.id))) router.refresh();
                    }}
                  >
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Supprimer le justificatif">
                      <Trash />
                    </Button>
                  </Confirmation>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
