import { SearchX } from "lucide-react";
import { Bouton } from "./bouton";

/** État vide soigné (ex. aucun résultat) avec invitation WhatsApp. */
export function EtatVideSite({ titre, texte, lienWhatsApp, action }: { titre: string; texte: string; lienWhatsApp?: string | null; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-carte border border-white/[0.08] bg-site-carte px-6 py-16 text-center">
      <SearchX className="size-12 text-site-accent" strokeWidth={1.25} aria-hidden />
      <h3 className="s-titre-3">{titre}</h3>
      <p className="max-w-[460px] text-site-2">{texte}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {lienWhatsApp && (
          <Bouton href={lienWhatsApp} externe variante="whatsapp">
            Dites-nous ce que vous cherchez
          </Bouton>
        )}
        {action}
      </div>
    </div>
  );
}
