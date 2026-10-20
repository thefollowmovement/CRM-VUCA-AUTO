import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Contenu centré : 1200 px maximum, marges de 16 px sur mobile. */
export function Conteneur({ className, children, etroit }: { className?: string; children: React.ReactNode; etroit?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 md:px-6", etroit ? "max-w-[820px]" : "max-w-[1200px]", className)}>{children}</div>;
}

/** Section pleine largeur : fond blanc ou gris très clair (alternance). */
export function Section({ fond = "blanc", className, children, id, ...reste }: { fond?: "blanc" | "gris"; className?: string; children: React.ReactNode; id?: string } & React.ComponentProps<"section">) {
  return (
    <section id={id} className={cn("py-16 md:py-24", fond === "gris" ? "bg-site-fond-alt" : "bg-site-fond", className)} {...reste}>
      {children}
    </section>
  );
}

/** Titre de section : surtitre facultatif, grand titre, phrase d'introduction, action à droite. */
export function EnTeteSection({ surtitre, titre, intro, action, centre, niveau = 2 }: { surtitre?: string; titre: string; intro?: string; action?: React.ReactNode; centre?: boolean; niveau?: 1 | 2 }) {
  const Titre = niveau === 1 ? "h1" : "h2";
  return (
    <div className={cn("mb-10 flex flex-col gap-4 md:mb-14", centre ? "items-center text-center" : "md:flex-row md:items-end md:justify-between")}>
      <div className={cn("max-w-[720px]", centre && "mx-auto")}>
        {surtitre && <p className="s-surtitre mb-2">{surtitre}</p>}
        <Titre className={niveau === 1 ? "s-titre-1" : "s-titre-2"}>{titre}</Titre>
        {intro && <p className="s-intro mt-3">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Bandeau d'information en haut du site (réglage « Bandeau »). */
export function Bandeau({ texte }: { texte: string }) {
  return (
    <div className="bg-site-fond-alt text-site-texte">
      <Conteneur className="flex min-h-10 items-center justify-center gap-2 py-2 text-center">
        <Info className="size-4 shrink-0 text-site-2" strokeWidth={1.5} aria-hidden />
        <p className="s-petit">{texte}</p>
      </Conteneur>
    </div>
  );
}
