import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bouton } from "./bouton";
import { Prix } from "./elements";
import { IconeWhatsApp } from "./icones";

/** Bouton WhatsApp flottant, discret, sur toutes les pages (sauf la fiche véhicule sur mobile). */
export function WhatsappFlottant({ lien, masquerMobile, className }: { lien: string; masquerMobile?: boolean; className?: string }) {
  return (
    <a
      href={lien}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Écrire sur WhatsApp"
      className={cn(
        "s-transition fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-sur-whatsapp shadow-site-fort transition-transform hover:scale-105 md:bottom-6 md:right-6",
        masquerMobile && "max-md:hidden",
        className,
      )}
    >
      <IconeWhatsApp className="size-7" />
    </a>
  );
}

/** Barre collante en bas de la fiche véhicule (mobile) : prix + WhatsApp + appel. */
export function BarreVehiculeMobile({ prixCentimes, negociable, lienWhatsApp, telephone, apercu, className }: { prixCentimes: number | null; negociable: boolean; lienWhatsApp: string | null; telephone: string | null; /** Démonstration : affichée sur place, sur tous les écrans */ apercu?: boolean; className?: string }) {
  return (
    <div className={cn("s-nav border-t border-white/[0.1]", apercu ? "rounded-carte border shadow-site" : "fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] md:hidden", className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Prix centimes={prixCentimes} negociable={negociable} etiquette className="min-w-0 flex-1 [&>span:first-child]:text-[22px]" />
        {telephone && (
          <a href={`tel:${telephone.replace(/[^\d+]/g, "")}`} aria-label="Appeler" className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-white/20 text-site-texte">
            <Phone className="size-5" strokeWidth={1.5} aria-hidden />
          </a>
        )}
        {lienWhatsApp && (
          <Bouton href={lienWhatsApp} externe variante="whatsapp" className="shrink-0">
            WhatsApp
          </Bouton>
        )}
      </div>
    </div>
  );
}
