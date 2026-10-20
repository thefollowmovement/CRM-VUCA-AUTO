// Couleur d'accent du site : contrôles de lisibilité (contraste WCAG).

/** « #0071E3 » → [0, 113, 227] (null si le format est invalide). */
export function hexVersRvb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminance relative WCAG 2.x (0 = noir, 1 = blanc). */
export function luminance(hex: string): number {
  const rvb = hexVersRvb(hex);
  if (!rvb) return 0;
  const [r, v, b] = rvb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}

/** Rapport de contraste entre deux couleurs (1 à 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Texte le plus lisible sur un bouton de cette couleur : blanc ou presque noir. */
export function texteSurCouleur(fond: string): "#ffffff" | "#1d1d1f" {
  return contraste(fond, "#ffffff") >= contraste(fond, "#1d1d1f") ? "#ffffff" : "#1d1d1f";
}

/** Accent utilisable : valeur valide, sinon le bleu par défaut. */
export const ACCENT_DEFAUT = "#0071E3";
export function accentValide(hex: string | null | undefined): string {
  return hex && hexVersRvb(hex) ? hex : ACCENT_DEFAUT;
}

/** Les liens en couleur d'accent sont-ils lisibles sur fond blanc (AA : 4,5:1) ? */
export function accentLisibleSurBlanc(hex: string): boolean {
  return contraste(hex, "#ffffff") >= 4.5;
}
