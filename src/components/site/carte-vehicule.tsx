import { ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { kmSite, prixSite } from "@/lib/site/format";
import type { SourcePhoto } from "@/lib/site/photos";
import type { VehiculePublic } from "@/lib/site/vehicule-public";
import { cn } from "@/lib/utils";
import { Badge, PhotoSite } from "./elements";

export type VehiculeCarte = Pick<VehiculePublic, "slug" | "titre" | "marque" | "modele" | "annee" | "kilometrage" | "carburant" | "boite" | "prixCentimes" | "prixNegociable" | "disponibilite" | "confiance" | "photos">;

/** « 2021 · 84 500 km · Essence · Manuelle » */
export function ligneCaracteristiques(v: Pick<VehiculeCarte, "annee" | "kilometrage" | "carburant" | "boite">): string {
  return [v.annee, kmSite(v.kilometrage), v.carburant, v.boite].filter(Boolean).join(" · ");
}

/** Carte d'un véhicule : photo 4:3 avec le prix en étiquette jaune, titre condensé, caractéristiques, badges. */
export function CarteVehicule({ vehicule: v, href, photo, prioritaire, className }: { vehicule: VehiculeCarte; href: string; photo: SourcePhoto | null; prioritaire?: boolean; className?: string }) {
  const garantie = v.confiance.find((c) => c.cle === "garantie");
  const premiereMain = v.confiance.some((c) => c.cle === "premiereMain");
  const vendu = v.disponibilite === "VENDU";
  return (
    <Link href={href} className={cn("s-carte group flex flex-col overflow-hidden rounded-carte border border-white/[0.08] bg-site-carte", className)}>
      <div className="relative">
        <PhotoSite photo={photo} alt={v.photos[0]?.alt ?? v.titre} prioritaire={prioritaire} arrondi="rounded-none" className={vendu ? "grayscale-[70%]" : undefined} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {v.disponibilite === "RESERVE" && <Badge ton="reserve">Réservé</Badge>}
          {vendu && <Badge ton="vendu">Vendu</Badge>}
          {!vendu && garantie && (
            <Badge>
              <ShieldCheck strokeWidth={1.75} aria-hidden /> {garantie.libelle}
            </Badge>
          )}
          {!vendu && premiereMain && (
            <Badge>
              <Sparkles strokeWidth={1.75} aria-hidden /> Première main
            </Badge>
          )}
        </div>
        {!vendu && v.prixCentimes !== null && <span className="s-etiquette-prix absolute bottom-3 right-3 text-[24px] shadow-site-fort">{prixSite(v.prixCentimes)}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="s-titre-4 line-clamp-2">{v.titre}</h3>
        <p className="s-petit s-chiffres text-site-2">{ligneCaracteristiques(v)}</p>
        {vendu ? <p className="mt-auto pt-2 font-semibold text-site-2">Vendu</p> : v.prixNegociable && v.prixCentimes !== null && <p className="s-petit mt-auto pt-2 text-site-2">Prix négociable</p>}
      </div>
    </Link>
  );
}
