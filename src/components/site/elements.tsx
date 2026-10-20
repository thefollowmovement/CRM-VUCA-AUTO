import { Car } from "lucide-react";
import { prixSite } from "@/lib/site/format";
import type { SourcePhoto } from "@/lib/site/photos";
import { cn } from "@/lib/utils";

/** Photo au format 4:3 (même cadrage partout), chargement différé sauf si prioritaire. */
export function PhotoSite({ photo, alt, sizes, prioritaire, className, arrondi = "rounded-carte" }: { photo: SourcePhoto | null; alt: string; sizes?: string; prioritaire?: boolean; className?: string; arrondi?: string }) {
  return (
    <div className={cn("s-carte-photo relative aspect-[4/3] overflow-hidden bg-site-fond-alt", arrondi, className)}>
      {photo ? (
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={sizes ?? "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"}
          alt={alt}
          loading={prioritaire ? "eager" : "lazy"}
          fetchPriority={prioritaire ? "high" : undefined}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-site-2">
          <Car className="size-12" strokeWidth={1} aria-hidden />
          <span className="sr-only">{alt} : photo à venir</span>
        </div>
      )}
    </div>
  );
}

export type TonBadge = "reserve" | "vendu" | "neutre" | "accent";
const TONS: Record<TonBadge, string> = {
  reserve: "bg-site-reserve-fond text-site-reserve",
  vendu: "bg-site-vendu-fond text-site-vendu",
  neutre: "bg-site-carte/90 text-site-texte shadow-site",
  accent: "bg-site-accent-fond text-site-sur-accent",
};

/** Petite pastille : Réservé (orange doux), Vendu (gris), Garantie, Première main… */
export function Badge({ ton = "neutre", children, className }: { ton?: TonBadge; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-7 items-center gap-1 rounded-full px-3 text-[13px] font-semibold tracking-[-0.005em] [&_svg]:size-3.5", TONS[ton], className)}>{children}</span>;
}

/** Prix en chiffres alignés, avec « négociable » si coché. */
export function Prix({ centimes, negociable, taille = "normal", className }: { centimes: number | null; negociable?: boolean; taille?: "normal" | "grand"; className?: string }) {
  return (
    <p className={cn("s-chiffres flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold tracking-[-0.02em]", taille === "grand" ? "text-[32px] md:text-[40px]" : "text-[21px]")}>{prixSite(centimes)}</span>
      {negociable && centimes !== null && <span className="s-petit text-site-2">négociable</span>}
    </p>
  );
}
