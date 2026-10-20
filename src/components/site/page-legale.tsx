import { Conteneur, Section } from "./mise-en-page";
import { TexteRiche } from "./texte-riche";

/** Page légale : titre + texte (saisi dans le CRM ou modèle généré). */
export function PageLegale({ titre, texte }: { titre: string; texte: string }) {
  return (
    <main>
      <Section className="pt-12 md:pt-20">
        <Conteneur etroit>
          <h1 className="s-titre-1 mb-10">{titre}</h1>
          <TexteRiche texte={texte} max={20000} className="text-site-texte [&_strong]:mt-4 [&_strong]:inline-block [&_strong]:text-[19px]" />
        </Conteneur>
      </Section>
    </main>
  );
}
