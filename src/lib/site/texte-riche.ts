// Texte de description : gras (**texte**) et listes (« - » en début de ligne) uniquement.
// Le texte est stocké tel quel et découpé en blocs ; il n'est JAMAIS injecté comme HTML.

export type Segment = { texte: string; gras: boolean };
export type Bloc = { type: "paragraphe"; lignes: Segment[][] } | { type: "liste"; items: Segment[][] };

export const LONGUEUR_MAX_DESCRIPTION = 5000;

/** Nettoyage à l'enregistrement : retours à la ligne unifiés, caractères de contrôle retirés, longueur limitée. */
export function nettoyerTexteRiche(texte: string, max = LONGUEUR_MAX_DESCRIPTION): string {
  return texte
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** « Bonne **affaire** » → [{texte:"Bonne ", gras:false}, {texte:"affaire", gras:true}] */
export function segmenter(ligne: string): Segment[] {
  const morceaux = ligne.split("**");
  // Nombre pair de morceaux = le dernier « ** » n'est pas refermé : on le garde comme du texte
  const nonFerme = morceaux.length % 2 === 0;
  const segments: Segment[] = [];
  morceaux.forEach((m, i) => {
    if (nonFerme && i === morceaux.length - 1) segments.push({ texte: `**${m}`, gras: false });
    else if (m) segments.push({ texte: m, gras: i % 2 === 1 });
  });
  return segments;
}

const PUCE = /^\s*[-•*]\s+/;

/** `max` : longueur maximale lue (les textes légaux sont plus longs qu'une description). */
export function decouperTexteRiche(texte: string | null | undefined, max = LONGUEUR_MAX_DESCRIPTION): Bloc[] {
  const blocs: Bloc[] = [];
  for (const ligne of nettoyerTexteRiche(texte ?? "", max).split("\n")) {
    const dernier = blocs.at(-1);
    if (!ligne.trim()) {
      blocs.push({ type: "paragraphe", lignes: [] }); // séparateur, retiré plus bas s'il reste vide
      continue;
    }
    if (PUCE.test(ligne)) {
      const item = segmenter(ligne.replace(PUCE, ""));
      if (dernier?.type === "liste") dernier.items.push(item);
      else blocs.push({ type: "liste", items: [item] });
    } else if (dernier?.type === "paragraphe") {
      dernier.lignes.push(segmenter(ligne));
    } else {
      blocs.push({ type: "paragraphe", lignes: [segmenter(ligne)] });
    }
  }
  return blocs.filter((b) => (b.type === "liste" ? b.items.length > 0 : b.lignes.length > 0));
}
