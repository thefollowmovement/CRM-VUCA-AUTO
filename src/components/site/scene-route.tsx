import { cn } from "@/lib/utils";
import { Voiture3D } from "./voiture-3d";

/**
 * Scène animée de l'accueil (et de la page « bientôt en ligne ») : une voiture arrive puis roule
 * sur une route qui défile, dans un halo de showroom. 100 % CSS (aucun JavaScript), coupée si
 * l'appareil demande moins d'animations. Sur ordinateur, la voiture 3D (voiture-3d.tsx) prend le relais.
 */
export function SceneRoute({
  pastille,
  info,
  className,
  compacte,
}: {
  /** Pastille jaune qui bouge : « Dès » + prix. */
  pastille?: { haut: string; valeur: string; bas?: string } | null;
  /** Petite carte en verre en haut à gauche (ex. dernière arrivée). */
  info?: { titre: string; texte: string } | null;
  className?: string;
  compacte?: boolean;
}) {
  return (
    <div
      className={cn(
        "s-scene relative overflow-hidden rounded-carte border border-white/[0.08] bg-[radial-gradient(65%_70%_at_50%_30%,#23252b_0%,#121316_62%,#0c0c0e_100%)]",
        compacte ? "h-[230px] md:h-[320px]" : "h-[260px] md:h-[380px]",
        className,
      )}
    >
      {/* Halo de lumière */}
      <div className="s-lumiere pointer-events-none absolute left-1/2 top-[-40%] h-[90%] w-[80%] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--site-accent)_22%,transparent),transparent)]" aria-hidden />
      {/* Sol et route */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] border-t border-white/[0.06] bg-[#121318]" aria-hidden />
      <div className="s-route absolute inset-x-0 bottom-[15%] h-[5px]" aria-hidden />
      {/* Voiture */}
      <div className="s-voiture-2d absolute bottom-[25%] left-1/2 w-[84%] max-w-[600px] -translate-x-1/2" aria-hidden>
        <div className="s-arrivee relative">
          <div className="absolute -left-[14%] top-[26%] flex flex-col gap-3 md:gap-4">
            <span className="s-vitesse block h-1 w-[90px] rounded bg-[color-mix(in_srgb,var(--site-accent)_65%,transparent)] md:w-[120px]" />
            <span className="s-vitesse block h-1 w-[60px] rounded bg-white/35 [animation-delay:.35s] md:w-[80px]" />
            <span className="s-vitesse block h-1 w-[100px] rounded bg-[color-mix(in_srgb,var(--site-accent)_45%,transparent)] [animation-delay:.7s] md:w-[140px]" />
          </div>
          <svg viewBox="0 0 420 170" className="s-suspension block w-full">
            <ellipse cx="216" cy="154" rx="190" ry="9" fill="#000" opacity=".6" />
            <path d="M30 128 C26 128 24 124 24 118 L24 104 C24 94 32 88 46 86 L120 78 Q150 50 200 42 L276 40 Q316 40 346 70 L380 80 Q404 86 404 106 L404 118 Q404 128 394 128 Z" fill="#e8e8ed" />
            <path d="M132 80 Q156 58 196 52 L236 50 L236 80 Z M248 50 L276 50 Q306 52 330 78 L248 80 Z" fill="#1c2333" />
            <path d="M386 92 L404 96" strokeWidth="6" strokeLinecap="round" style={{ stroke: "var(--site-accent)" }} />
          </svg>
          {/* Roues : positions calquées sur le dessin (centres à 112 et 330 sur 420, rayon 26) */}
          <span className="s-suspension absolute inset-0">
            <span className="s-roue left-[20.5%] top-[60%] w-[12.4%]">
              <span />
            </span>
            <span className="s-roue left-[72.4%] top-[60%] w-[12.4%]">
              <span />
            </span>
          </span>
        </div>
      </div>
      {/* Voiture 3D (ordinateur uniquement, chargée après la page) : remplace la voiture dessinée */}
      <Voiture3D />
      {pastille && (
        <div className="s-pastille absolute right-[5%] top-4 flex size-24 flex-col items-center justify-center rounded-full bg-site-accent-fond text-center text-site-sur-accent md:top-8 md:size-[156px]">
          <span className="s-condense text-[12px] md:text-[17px]">{pastille.haut}</span>
          <span className="s-condense s-chiffres text-[24px] md:text-[40px]">{pastille.valeur}</span>
          {pastille.bas && <span className="s-condense mt-1 hidden text-[13px] md:block">{pastille.bas}</span>}
        </div>
      )}
      {info && (
        <div className="s-flotte absolute left-4 top-4 hidden max-w-[60%] rounded-2xl border border-white/[0.12] bg-[#1d1e22]/90 px-4 py-3 sm:block md:left-7 md:top-7">
          <p className="s-petit text-site-2">{info.titre}</p>
          <p className="truncate font-semibold">{info.texte}</p>
        </div>
      )}
    </div>
  );
}
