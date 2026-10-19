import {
  BadgeAlert,
  CircleDot,
  ClipboardCheck,
  Cog,
  Droplet,
  Ellipsis,
  FileText,
  Fuel,
  Gavel,
  Megaphone,
  Shield,
  Sparkles,
  SprayCan,
  SquareParking,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Icônes proposées pour les catégories de dépenses. */
export const ICONES_CATEGORIES: Record<string, LucideIcon> = {
  FileText,
  Wrench,
  SprayCan,
  CircleDot,
  Cog,
  ClipboardCheck,
  Droplet,
  Sparkles,
  Truck,
  Shield,
  SquareParking,
  Megaphone,
  Gavel,
  Fuel,
  BadgeAlert,
  Ellipsis,
};

export function IconeCategorie({ icone, couleur }: { icone: string | null; couleur: string | null }) {
  const Icone = (icone && ICONES_CATEGORIES[icone]) || Ellipsis;
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${couleur ?? "#78716c"}22`, color: couleur ?? "#78716c" }}
    >
      <Icone className="size-4" />
    </span>
  );
}
