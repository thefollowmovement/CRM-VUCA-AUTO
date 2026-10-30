"use client";

import { Camera, ExternalLink, FileText, LoaderCircle, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirmation } from "@/components/ui/confirmation";
import { SelectNatif } from "@/components/ui/select-natif";
import { compresserImage } from "@/lib/compression-image";
import { formatDate } from "@/lib/format";
import { CATEGORIES_DOCUMENTS_CLIENT, LIBELLES_DOCUMENTS_CLIENT } from "@/lib/validations/location";
import { envoyerDocumentClient, supprimerDocumentClient } from "@/server/actions/clients";

type Document = { id: string; categorie: string; nomOriginal: string; typeMime: string; creeLe: Date };

/** Scans du client : permis, pièce d'identité, justificatif de domicile (photo ou PDF). */
export function DocumentsClient({ clientId, documents, modifiable }: { clientId: string; documents: Document[]; modifiable: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [categorie, setCategorie] = useState<string>("PERMIS_RECTO");
  const [enCours, setEnCours] = useState(false);

  const envoyer = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnCours(true);
    const f = new FormData();
    f.set("clientId", clientId);
    f.set("categorie", categorie);
    // Scans : un peu plus de définition pour rester lisibles
    f.set("document", await compresserImage(fichier, 2000, 0.88));
    if (traiterResultat(await envoyerDocumentClient(f))) router.refresh();
    if (champ.current) champ.current.value = "";
    setEnCours(false);
  };
  const libelle = (c: string) => LIBELLES_DOCUMENTS_CLIENT[c as keyof typeof LIBELLES_DOCUMENTS_CLIENT] ?? c;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Permis recto / verso, pièce d&apos;identité, justificatif de domicile.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {modifiable && (
          <div className="flex flex-wrap items-end gap-2">
            <SelectNatif aria-label="Type de document" value={categorie} onChange={(e) => setCategorie(e.target.value)} className="min-w-0 flex-1">
              {CATEGORIES_DOCUMENTS_CLIENT.map((c) => (
                <option key={c} value={c}>
                  {LIBELLES_DOCUMENTS_CLIENT[c]}
                </option>
              ))}
            </SelectNatif>
            <input ref={champ} id="document-client" type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => envoyer(e.target.files?.[0])} />
            <Button type="button" disabled={enCours} onClick={() => champ.current?.click()}>
              {enCours ? <LoaderCircle className="animate-spin" /> : <Camera />} Photo / fichier
            </Button>
          </div>
        )}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {documents.map((d) => (
              <li key={d.id} className="overflow-hidden rounded-lg border">
                <a href={`/api/fichiers/${d.id}`} target="_blank" rel="noopener noreferrer" className="block">
                  {d.typeMime.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/fichiers/${d.id}?taille=mini`} alt={libelle(d.categorie)} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <span className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-muted-foreground">
                      <FileText className="size-8" />
                    </span>
                  )}
                </a>
                <div className="flex items-center gap-1 border-t px-2 py-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{libelle(d.categorie)}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(d.creeLe)}</span>
                  </span>
                  <Button variant="ghost" size="icon" className="size-8" asChild aria-label="Ouvrir">
                    <a href={`/api/fichiers/${d.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                    </a>
                  </Button>
                  {modifiable && (
                    <Confirmation
                      titre="Supprimer ce document ?"
                      libelleConfirmer="Supprimer"
                      onConfirmer={async () => {
                        if (traiterResultat(await supprimerDocumentClient(d.id))) router.refresh();
                      }}
                    >
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Supprimer le document">
                        <Trash />
                      </Button>
                    </Confirmation>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
