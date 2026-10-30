"use client";

import { Camera, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Champ } from "@/components/formulaires/champ";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { compresserImage } from "@/lib/compression-image";
import { COULEURS_GRAVITE, GRAVITES, LIBELLES_GRAVITE, LIBELLES_TYPE_DOMMAGE, libelleZone, TYPES_DOMMAGE, type Gravite, type TypeDommage, type Vue } from "@/lib/schema-vehicule";
import { cn } from "@/lib/utils";
import { ajouterDommage } from "@/server/actions/etats-des-lieux";

export type DommageAjoute = { id: string; vue: Vue; zone: string; positionX: number; positionY: number; type: TypeDommage; gravite: Gravite; description: string | null; photoId: string | null };
export type PointTouche = { vue: Vue; zone: string; x: number; y: number };

/** Après un toucher sur le schéma : type, gravité, description, photo du dommage. */
export function DialogueDommage({
  point,
  vehiculeId,
  etatDesLieuxId,
  onFermer,
  onAjoute,
}: {
  point: PointTouche;
  vehiculeId: string;
  etatDesLieuxId: string | null;
  onFermer: () => void;
  onAjoute: (d: DommageAjoute) => void;
}) {
  const [type, setType] = useState<TypeDommage | null>(point.vue === "INTERIEUR" ? "INTERIEUR" : point.zone.startsWith("jante") ? "JANTE_ABIMEE" : null);
  const [gravite, setGravite] = useState<Gravite>("LEGER");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return setApercu(null);
    const url = URL.createObjectURL(photo);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const enregistrer = async () => {
    if (!type) {
      toast.error("Choisissez le type de dommage.");
      return;
    }
    setEnCours(true);
    const donnees = { vehiculeId, etatDesLieuxId, vue: point.vue, zone: point.zone, positionX: point.x, positionY: point.y, type, gravite, description };
    const f = new FormData();
    f.set("donnees", JSON.stringify(donnees));
    if (photo) f.set("photo", await compresserImage(photo));
    const r = await ajouterDommage(f);
    setEnCours(false);
    if (traiterResultat(r) && r.donnees) {
      onAjoute({ id: r.donnees.id, vue: point.vue, zone: point.zone, positionX: point.x, positionY: point.y, type, gravite, description: description.trim() || null, photoId: r.donnees.photoId });
      onFermer();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dommage</DialogTitle>
          <DialogDescription>{libelleZone(point.vue, point.zone)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Type</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPES_DOMMAGE.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn("h-11 rounded-lg border text-sm", type === t ? "border-primary bg-primary font-medium text-primary-foreground" : "hover:bg-accent")}
                >
                  {LIBELLES_TYPE_DOMMAGE[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Gravité</legend>
            <div className="grid grid-cols-3 gap-2">
              {GRAVITES.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gravite === g}
                  onClick={() => setGravite(g)}
                  className={cn("flex h-11 items-center justify-center gap-2 rounded-lg border text-sm", gravite === g ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent")}
                >
                  <span className="size-3 rounded-full" style={{ backgroundColor: COULEURS_GRAVITE[g] }} /> {LIBELLES_GRAVITE[g]}
                </button>
              ))}
            </div>
          </fieldset>
          <Champ label="Précisions (facultatif)" htmlFor="description-dommage">
            <Textarea id="description-dommage" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex. : rayure de 10 cm" />
          </Champ>
          <input ref={champ} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          {apercu ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={apercu} alt="Photo du dommage" className="size-20 rounded-lg border object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                <X /> Retirer la photo
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => champ.current?.click()}>
              <Camera /> Photo du dommage
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button type="button" onClick={enregistrer} disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" />}
            Ajouter le dommage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
