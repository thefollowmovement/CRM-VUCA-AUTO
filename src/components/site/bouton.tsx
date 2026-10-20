import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconeWhatsApp } from "./icones";

type Variante = "principal" | "secondaire" | "contour" | "whatsapp" | "discret";
type Taille = "normal" | "grand" | "compact";

const VARIANTES: Record<Variante, string> = {
  // Plein, couleur d'accent
  principal: "bg-site-accent-fond text-site-sur-accent hover:brightness-110 active:brightness-95",
  // Texte + chevron « › » (style Apple)
  secondaire: "text-site-accent hover:underline underline-offset-4 !px-1",
  // Pilule à bord fin (ex. « Appeler »)
  contour: "border border-site-sep text-site-texte hover:bg-site-fond-alt",
  // Vert réservé à WhatsApp
  whatsapp: "bg-whatsapp text-sur-whatsapp hover:bg-[var(--site-whatsapp-survol)]",
  discret: "bg-site-fond-alt text-site-texte hover:bg-site-sep/60",
};
const TAILLES: Record<Taille, string> = {
  compact: "min-h-11 px-4 text-[14px] gap-1.5 [&_svg]:size-4",
  normal: "min-h-11 px-5 text-[17px] gap-2 [&_svg]:size-5",
  grand: "min-h-13 px-7 text-[17px] gap-2 [&_svg]:size-5",
};

type Commun = { variante?: Variante; taille?: Taille; className?: string; children: React.ReactNode; pleineLargeur?: boolean };
type PropsLien = Commun & { href: string; externe?: boolean } & Omit<React.ComponentProps<"a">, "href" | "className" | "children">;
type PropsBouton = Commun & { href?: undefined } & Omit<React.ComponentProps<"button">, "className" | "children">;

/**
 * Bouton du site : pilule (rayon 9999 px), zone tactile ≥ 44 px.
 * Avec `href` : lien (interne via next/link, externe dans un nouvel onglet). Sinon : <button>.
 */
export function Bouton(props: PropsLien | PropsBouton) {
  const { variante = "principal", taille = "normal", className, children, pleineLargeur } = props;
  const classes = cn(
    "s-transition inline-flex select-none items-center justify-center rounded-full font-medium tracking-[-0.01em] transition-[background-color,filter,color,box-shadow] whitespace-nowrap disabled:pointer-events-none disabled:opacity-40",
    TAILLES[taille],
    VARIANTES[variante],
    pleineLargeur && "w-full",
    className,
  );
  const contenu = (
    <>
      {variante === "whatsapp" && <IconeWhatsApp />}
      {children}
      {variante === "secondaire" && <ChevronRight aria-hidden strokeWidth={2} className="-ml-0.5 !size-4" />}
    </>
  );
  if (props.href !== undefined) {
    const { href, externe, variante: _v, taille: _t, className: _c, children: _e, pleineLargeur: _p, ...reste } = props;
    if (externe || /^(https?:|tel:|mailto:)/.test(href)) {
      return (
        <a href={href} className={classes} {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...reste}>
          {contenu}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...reste}>
        {contenu}
      </Link>
    );
  }
  const { variante: _v, taille: _t, className: _c, children: _e, pleineLargeur: _p, href: _h, type = "button", ...reste } = props;
  return (
    <button type={type} className={classes} {...reste}>
      {contenu}
    </button>
  );
}
