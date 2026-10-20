import { cn } from "@/lib/utils";

export const LIENS_SITE = [
  { href: "/voitures", libelle: "Nos voitures" },
  { href: "/a-propos", libelle: "À propos" },
  { href: "/contact", libelle: "Contact" },
] as const;

export type LogoSite = { nom: string; clair: string | null; fonce: string | null };

/** Logo (image claire / foncée selon le mode) ou nom en texte. */
export function Logo({ logo, className }: { logo: LogoSite; className?: string }) {
  if (!logo.clair && !logo.fonce) return <span className={cn("text-[19px] font-semibold tracking-[-0.02em]", className)}>{logo.nom}</span>;
  const clair = logo.clair ?? logo.fonce!;
  const fonce = logo.fonce ?? logo.clair!;
  return (
    <span className={cn("inline-flex h-8 items-center", className)}>
      <img src={clair} alt={logo.nom} className="s-clair-seul h-8 w-auto max-w-[160px] object-contain" />
      <img src={fonce} alt={logo.nom} className="s-sombre-seul h-8 w-auto max-w-[160px] object-contain" />
    </span>
  );
}
