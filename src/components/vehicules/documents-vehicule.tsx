"use client";

import { ExternalLink, FileText, ImageIcon, LoaderCircle, Trash, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Confirmation } from "@/components/ui/confirmation";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";
import { compresserImage } from "@/lib/compression-image";
import { formatDate } from "@/lib/format";
import { CATEGORIES_DOCUMENTS_VEHICULE, LIBELLES_DOCUMENTS_VEHICULE } from "@/lib/validations/vehicule";
import { envoyerDocumentVehicule, supprimerFichierVehicule } from "@/server/actions/vehicules";

type Document = {
  id: string;
  categorie: (typeof CATEGORIES_DOCUMENTS_VEHICULE)[number];
  libelle: string | null;
  nomOriginal: string;
  typeMime: string;
  tailleOctets: number;
  creeLe: Date;
};

const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.ceil(o / 1024)} Ko`);

export function DocumentsVehicule({ vehiculeId, documents, modifiable }: { vehiculeId: string; documents: Document[]; modifiable: boolean }) {
  const router = useRouter();
  const champFichier = useRef<HTMLInputElement>(null);
  const [categorie, setCategorie] = useState<string>("CARTE_GRISE");
  const [libelle, setLibelle] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async () => {
    if (!fichier) {
      toast.error("Choisissez un fichier.");
      return;
    }
    setEnCours(true);
    const formulaire = new FormData();
    formulaire.set("vehiculeId", vehiculeId);
    formulaire.set("categorie", categorie);
    formulaire.set("libelle", libelle);
    formulaire.set("document", await compresserImage(fichier, 2000, 0.85));
    if (traiterResultat(await envoyerDocumentVehicule(formulaire))) {
      setFichier(null);
      setLibelle("");
      if (champFichier.current) champFichier.current.value = "";
      router.refresh();
    }
    setEnCours(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {modifiable && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un document</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end">
            <Champ label="Type" htmlFor="categorie">
              <SelectNatif id="categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {CATEGORIES_DOCUMENTS_VEHICULE.map((c) => (
                  <option key={c} value={c}>
                    {LIBELLES_DOCUMENTS_VEHICULE[c]}
                  </option>
                ))}
              </SelectNatif>
            </Champ>
            <Champ label="Libellé (facultatif)" htmlFor="libelle">
              <Input id="libelle" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex. : CT du 12/03" />
            </Champ>
            <Champ label="Fichier (PDF ou photo)" htmlFor="document">
              <Input
                ref={champFichier}
                id="document"
                type="file"
                accept="application/pdf,image/*"
                className="pt-2 md:pt-1.5"
                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              />
            </Champ>
            <Button onClick={envoyer} disabled={enCours || !fichier}>
              {enCours ? <LoaderCircle className="animate-spin" /> : <Upload />}
              Ajouter
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document : carte grise, facture d&apos;achat, contrôle technique…</p>
          ) : (
            <ul className="divide-y">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {d.typeMime === "application/pdf" ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.libelle ?? LIBELLES_DOCUMENTS_VEHICULE[d.categorie]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {LIBELLES_DOCUMENTS_VEHICULE[d.categorie]} · {formatDate(d.creeLe)} · {taille(d.tailleOctets)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild aria-label="Ouvrir">
                    <a href={`/api/fichiers/${d.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink />
                    </a>
                  </Button>
                  {modifiable && (
                    <Confirmation
                      titre="Supprimer ce document ?"
                      libelleConfirmer="Supprimer"
                      onConfirmer={async () => {
                        if (traiterResultat(await supprimerFichierVehicule(d.id))) router.refresh();
                      }}
                    >
                      <Button variant="ghost" size="icon" className="text-destructive" aria-label="Supprimer">
                        <Trash />
                      </Button>
                    </Confirmation>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
