import {
  Car,
  ChartColumn,
  Globe,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type EntreeNavigation = {
  href: string;
  libelle: string;
  icone: LucideIcon;
  /** Affiché directement dans la barre du bas sur téléphone. */
  barreMobile?: boolean;
  adminSeulement?: boolean;
};

export const NAVIGATION: EntreeNavigation[] = [
  { href: "/dashboard", libelle: "Dashboard", icone: LayoutDashboard, barreMobile: true },
  { href: "/vehicules", libelle: "Véhicules", icone: Car, barreMobile: true },
  { href: "/location", libelle: "Location", icone: KeyRound, barreMobile: true },
  { href: "/clients", libelle: "Clients", icone: Users },
  { href: "/depenses", libelle: "Dépenses", icone: Receipt, barreMobile: true },
  { href: "/investisseurs", libelle: "Investisseurs", icone: HandCoins },
  { href: "/rapports", libelle: "Rapports", icone: ChartColumn },
  { href: "/site-web", libelle: "Site web", icone: Globe },
  { href: "/reglages", libelle: "Réglages", icone: Settings, adminSeulement: true },
];

export function estActif(chemin: string, href: string) {
  return chemin === href || chemin.startsWith(`${href}/`);
}
