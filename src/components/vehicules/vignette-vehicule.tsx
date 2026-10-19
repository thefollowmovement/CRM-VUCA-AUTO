import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

/** Photo principale (miniature) ou pictogramme si aucune photo. */
export function VignetteVehicule({ photoId, alt, className }: { photoId: string | null; alt: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-muted text-muted-foreground", className)}>
      {photoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/fichiers/${photoId}?taille=mini`} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <Car className="size-1/3 min-h-5 min-w-5 opacity-50" />
      )}
    </div>
  );
}
