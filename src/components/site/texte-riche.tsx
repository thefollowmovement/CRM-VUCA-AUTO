import { Fragment } from "react";
import { decouperTexteRiche, type Segment } from "@/lib/site/texte-riche";
import { cn } from "@/lib/utils";

const Segments = ({ segments }: { segments: Segment[] }) => (
  <>
    {segments.map((s, i) => (s.gras ? <strong key={i} className="font-semibold">{s.texte}</strong> : <Fragment key={i}>{s.texte}</Fragment>))}
  </>
);

/** Affiche une description (gras + listes) : le texte n'est jamais interprété comme du HTML. */
export function TexteRiche({ texte, className, max }: { texte: string | null | undefined; className?: string; max?: number }) {
  const blocs = decouperTexteRiche(texte, max);
  if (blocs.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {blocs.map((b, i) =>
        b.type === "liste" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>
                <Segments segments={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.lignes.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Segments segments={l} />
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
