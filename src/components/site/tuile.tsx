import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tuile de caractéristique (année, kilométrage, carburant…) : rayon 14 px, icône fine. */
export function Tuile({ icone: Icone, libelle, valeur, className }: { icone: LucideIcon; libelle: string; valeur: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-tuile bg-site-fond-alt p-4", className)}>
      <Icone className="size-6 text-site-2" strokeWidth={1.5} aria-hidden />
      <div>
        <p className="s-petit text-site-2">{libelle}</p>
        <p className="s-chiffres text-[17px] font-semibold tracking-[-0.01em]">{valeur}</p>
      </div>
    </div>
  );
}

export function GrilleTuiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
