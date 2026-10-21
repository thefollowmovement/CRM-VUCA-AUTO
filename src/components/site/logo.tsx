import { cn } from "@/lib/utils";

export const LIENS_SITE = [
  { href: "/voitures", libelle: "Nos voitures" },
  { href: "/a-propos", libelle: "À propos" },
  { href: "/contact", libelle: "Contact" },
] as const;

export type LogoSite = { nom: string; clair: string | null; fonce: string | null };

/** Tracé du « V » en forme de route (icône 64 × 64), partagé avec l'icône d'onglet et les images de partage. */
export const TRACE_V = "M17 15 H28 L35 36 L42 15 H53 L40 49 H30 Z";

/** Icône de la marque : carré arrondi couleur d'accent, « V » de route et traits de vitesse. */
export function IconeMarque({ className, anime }: { className?: string; anime?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9 shrink-0", className)} aria-hidden>
      <rect width="64" height="64" rx="16" style={{ fill: "var(--site-accent)" }} />
      <g className={anime ? "s-flotte" : undefined} style={{ fill: "var(--site-sur-accent)" }}>
        <rect x="6" y="24" width="8" height="3.5" rx="1.75" />
        <rect x="4" y="32" width="10" height="3.5" rx="1.75" />
      </g>
      <path d={TRACE_V} style={{ fill: "var(--site-sur-accent)" }} />
    </svg>
  );
}

/** « VUCA AUTO » → « VUCA » + « AUTO » (le dernier mot en couleur d'accent). */
export function decouperNom(nom: string): [string, string] {
  const mots = nom.trim().split(/\s+/);
  if (mots.length < 2) return [nom.trim(), ""];
  return [mots.slice(0, -1).join(" "), mots.at(-1)!];
}

/** Nom en lettres condensées, dernier mot en couleur d'accent. */
export function NomMarque({ nom, className }: { nom: string; className?: string }) {
  const [debut, fin] = decouperNom(nom);
  return (
    <span className={cn("s-condense text-[26px] tracking-[0.005em] text-site-texte", className)}>
      {debut}
      {fin && <span className="text-site-accent">{fin}</span>}
    </span>
  );
}

/** Logo envoyé dans le CRM (version pour fond foncé de préférence), sinon icône + nom. */
export function Logo({ logo, className }: { logo: LogoSite; className?: string }) {
  const image = logo.fonce ?? logo.clair;
  if (!image) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <IconeMarque />
        <NomMarque nom={logo.nom} />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex h-9 items-center", className)}>
      <img src={image} alt={logo.nom} className="h-9 w-auto max-w-[180px] object-contain" />
    </span>
  );
}
