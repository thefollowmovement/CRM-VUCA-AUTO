"use client";

import { ArrowLeft, ArrowRight, Crop, GripVertical, ImagePlus, LoaderCircle, Plus, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { traiterResultat } from "@/components/formulaires/soumission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recadrage } from "@/lib/site/recadrage";
import { cn } from "@/lib/utils";
import { basculerPhotoPublique, definirCouverture, ordonnerPhotosPubliques } from "@/server/actions/annonces";
import { ApercuRecadre, RecadragePhoto } from "./recadrage-photo";

export type PhotoAnnonce = { id: string; publique: boolean; largeur: number | null; hauteur: number | null; recadrage: Recadrage | null };

/**
 * Photos de l'annonce : choix des photos publiques, ordre (glisser-déposer ou flèches),
 * photo de couverture et recadrage 4:3.
 */
export function PhotosAnnonce({ vehiculeId, publiques, autres, couvertureId }: { vehiculeId: string; publiques: PhotoAnnonce[]; autres: PhotoAnnonce[]; couvertureId: string | null }) {
  const router = useRouter();
  const [ordre, setOrdre] = useState(publiques.map((p) => p.id));
  const [glissee, setGlissee] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aRecadrer, setARecadrer] = useState<PhotoAnnonce | null>(null);

  // Resynchronise l'ordre local quand le serveur renvoie une autre liste (après router.refresh)
  const signature = publiques.map((p) => p.id).join(",");
  const [signatureVue, setSignatureVue] = useState(signature);
  if (signature !== signatureVue) {
    setSignatureVue(signature);
    setOrdre(publiques.map((p) => p.id));
  }

  const parId = new Map(publiques.map((p) => [p.id, p]));
  const liste = ordre.map((id) => parId.get(id)).filter((p): p is PhotoAnnonce => !!p);
  const couverture = couvertureId && parId.has(couvertureId) ? couvertureId : liste[0]?.id;

  const agir = async (cle: string, action: () => Promise<Parameters<typeof traiterResultat>[0]>) => {
    setEnCours(cle);
    if (traiterResultat(await action())) router.refresh();
    setEnCours(null);
  };

  const enregistrerOrdre = async (nouvel: string[]) => {
    const avant = ordre;
    setOrdre(nouvel);
    setEnCours("ordre");
    const r = await ordonnerPhotosPubliques(vehiculeId, nouvel);
    if (!traiterResultat(r)) setOrdre(avant);
    else router.refresh();
    setEnCours(null);
  };

  const deplacer = (id: string, sens: -1 | 1) => {
    const i = ordre.indexOf(id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= ordre.length) return;
    const n = [...ordre];
    [n[i], n[j]] = [n[j]!, n[i]!];
    void enregistrerOrdre(n);
  };

  const deposerSur = (cible: string) => {
    if (!glissee || glissee === cible) return;
    const n = ordre.filter((id) => id !== glissee);
    n.splice(n.indexOf(cible), 0, glissee);
    setGlissee(null);
    void enregistrerOrdre(n);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Photos de l&apos;annonce
          {enCours && <LoaderCircle className="size-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Seules les photos cochées sont visibles sur le site (sans les données de localisation). Faites-les glisser pour changer l&apos;ordre ; l&apos;étoile choisit la photo de couverture.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <section aria-label="Photos publiques">
          <h3 className="mb-2 text-sm font-semibold">
            Sur le site ({liste.length})
          </h3>
          {liste.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aucune photo publique. Ajoutez des photos depuis la liste ci-dessous.</p>
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {liste.map((p, i) => {
                const estCouverture = p.id === couverture;
                return (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      setGlissee(p.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setGlissee(null)}
                    onDragOver={(e) => {
                      if (glissee) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      deposerSur(p.id);
                    }}
                    className={cn("flex flex-col overflow-hidden rounded-lg border bg-card", glissee === p.id && "opacity-40", estCouverture && "ring-2 ring-primary")}
                    data-photo-publique={p.id}
                  >
                    <div className="relative">
                      <ApercuRecadre id={p.id} largeur={p.largeur} hauteur={p.hauteur} recadrage={p.recadrage} alt={`Photo ${i + 1}`} />
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">
                        <GripVertical className="size-3" aria-hidden /> {i + 1}
                      </span>
                      {estCouverture && <span className="absolute right-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">Couverture</span>}
                    </div>
                    <div className="grid grid-cols-5 border-t">
                      <BoutonIcone libelle="Avancer" onClick={() => deplacer(p.id, -1)} desactive={i === 0 || !!enCours}>
                        <ArrowLeft />
                      </BoutonIcone>
                      <BoutonIcone libelle="Reculer" onClick={() => deplacer(p.id, 1)} desactive={i === liste.length - 1 || !!enCours}>
                        <ArrowRight />
                      </BoutonIcone>
                      <BoutonIcone libelle="Photo de couverture" onClick={() => agir(p.id, () => definirCouverture(p.id))} desactive={estCouverture || !!enCours}>
                        <Star className={estCouverture ? "fill-current text-primary" : undefined} />
                      </BoutonIcone>
                      <BoutonIcone libelle="Recadrer" onClick={() => setARecadrer(p)} desactive={!p.largeur || !p.hauteur}>
                        <Crop />
                      </BoutonIcone>
                      <BoutonIcone libelle="Retirer du site" onClick={() => agir(p.id, () => basculerPhotoPublique(p.id, false))} desactive={!!enCours}>
                        <X />
                      </BoutonIcone>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-label="Autres photos du véhicule">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Autres photos du véhicule ({autres.length})</h3>
            <div className="flex flex-wrap gap-2">
              {autres.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!!enCours}
                  onClick={() =>
                    agir("toutes", async () => {
                      for (const p of autres) {
                        const r = await basculerPhotoPublique(p.id, true);
                        if (!r.ok) return r;
                      }
                      return { ok: true, message: `${autres.length} photos ajoutées à l'annonce.` };
                    })
                  }
                >
                  <Plus /> Tout ajouter
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/vehicules/${vehiculeId}`}>
                  <ImagePlus /> Ajouter des photos
                </Link>
              </Button>
            </div>
          </div>
          {autres.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toutes les photos du véhicule sont sur le site.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {autres.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => agir(p.id, () => basculerPhotoPublique(p.id, true))}
                    disabled={!!enCours}
                    className="group relative block w-full overflow-hidden rounded-lg border opacity-70 transition hover:opacity-100 disabled:pointer-events-none"
                    aria-label="Ajouter cette photo à l'annonce"
                  >
                    <ApercuRecadre id={p.id} largeur={null} hauteur={null} recadrage={null} alt="" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                      <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow">
                        {enCours === p.id ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-5" />}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
      {aRecadrer?.largeur && aRecadrer.hauteur && (
        <RecadragePhoto
          key={aRecadrer.id}
          photo={{ id: aRecadrer.id, largeur: aRecadrer.largeur, hauteur: aRecadrer.hauteur, recadrage: aRecadrer.recadrage }}
          ouvert
          onFermer={() => setARecadrer(null)}
        />
      )}
    </Card>
  );
}

function BoutonIcone({ libelle, onClick, desactive, children }: { libelle: string; onClick: () => void; desactive?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={libelle}
      aria-label={libelle}
      onClick={onClick}
      disabled={desactive}
      className="flex h-11 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
