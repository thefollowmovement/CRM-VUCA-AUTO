"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Confirmation } from "@/components/ui/confirmation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { compresserImage } from "@/lib/compression-image";
import { cn } from "@/lib/utils";
import { definirPhotoPrincipale, envoyerPhotoVehicule, supprimerFichierVehicule } from "@/server/actions/vehicules";

type Photo = { id: string; estPrincipale: boolean };

export function GaleriePhotos({ vehiculeId, photos, modifiable }: { vehiculeId: string; photos: Photo[]; modifiable: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [ouverte, setOuverte] = useState<number | null>(null);

  const envoyer = async (fichiers: File[]) => {
    if (fichiers.length === 0) return;
    setEnvoiEnCours(true);
    const idToast = toast.loading(`Envoi de ${fichiers.length} photo(s)…`);
    let reussies = 0;
    for (const [i, brut] of fichiers.entries()) {
      toast.loading(`Envoi de la photo ${i + 1} sur ${fichiers.length}…`, { id: idToast });
      const fichier = await compresserImage(brut);
      const formulaire = new FormData();
      formulaire.set("vehiculeId", vehiculeId);
      formulaire.set("photo", fichier);
      const r = await envoyerPhotoVehicule(formulaire);
      if (r.ok) reussies += 1;
      else toast.error(`${brut.name} : ${r.message}`);
    }
    toast.dismiss(idToast);
    if (reussies) toast.success(`${reussies} photo(s) ajoutée(s).`);
    setEnvoiEnCours(false);
    if (champ.current) champ.current.value = "";
    router.refresh();
  };

  const photo = ouverte !== null ? photos[ouverte] : undefined;

  return (
    <div>
      {photos.length === 0 ? (
        <button
          type="button"
          disabled={!modifiable || envoiEnCours}
          onClick={() => champ.current?.click()}
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary disabled:pointer-events-none"
        >
          <ImagePlus className="size-8" />
          <span className="text-sm font-medium">{modifiable ? "Ajouter des photos" : "Aucune photo"}</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOuverte(i)}
              className={cn(
                "relative overflow-hidden rounded-lg bg-muted",
                i === 0 ? "col-span-3 row-span-2 aspect-[16/9] sm:col-span-2" : "aspect-square",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/fichiers/${p.id}${i === 0 ? "" : "?taille=mini"}`} alt="" loading="lazy" className="size-full object-cover" />
              {p.estPrincipale && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  <Star className="size-3 fill-current" /> Principale
                </span>
              )}
            </button>
          ))}
          {modifiable && (
            <button
              type="button"
              disabled={envoiEnCours}
              onClick={() => champ.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              <ImagePlus className="size-6" />
              Ajouter
            </button>
          )}
        </div>
      )}

      <input
        ref={champ}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void envoyer(Array.from(e.target.files ?? []))}
      />

      <Dialog open={!!photo} onOpenChange={(o) => !o && setOuverte(null)}>
        <DialogContent className="md:max-w-4xl">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {photo && ouverte !== null && (
            <>
              <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/fichiers/${photo.id}`} alt="" className="max-h-[70dvh] w-auto object-contain" />
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 rounded-full opacity-80"
                      aria-label="Photo précédente"
                      onClick={() => setOuverte((ouverte - 1 + photos.length) % photos.length)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 rounded-full opacity-80"
                      aria-label="Photo suivante"
                      onClick={() => setOuverte((ouverte + 1) % photos.length)}
                    >
                      <ChevronRight />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  Photo {ouverte + 1} sur {photos.length}
                </span>
                {modifiable && (
                  <div className="flex gap-2">
                    {!photo.estPrincipale && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (traiterResultat(await definirPhotoPrincipale(photo.id))) {
                            setOuverte(null);
                            router.refresh();
                          }
                        }}
                      >
                        <Star /> Photo principale
                      </Button>
                    )}
                    <Confirmation
                      titre="Supprimer cette photo ?"
                      libelleConfirmer="Supprimer"
                      onConfirmer={async () => {
                        if (traiterResultat(await supprimerFichierVehicule(photo.id))) {
                          setOuverte(null);
                          router.refresh();
                        }
                      }}
                    >
                      <Button variant="ghost" className="text-destructive">
                        <Trash /> Supprimer
                      </Button>
                    </Confirmation>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
