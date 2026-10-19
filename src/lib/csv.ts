// Export CSV lisible directement par Excel en français :
// séparateur « ; », virgule décimale, encodage UTF-8 avec BOM.

export function celluleCsv(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined) return "";
  const s = String(valeur);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Centimes → « 1234,56 » (nombre reconnu par Excel FR, sans symbole). */
export function montantCsv(centimes: number | null | undefined): string {
  if (centimes === null || centimes === undefined) return "";
  return (centimes / 100).toFixed(2).replace(".", ",");
}

export function genererCsv(entetes: string[], lignes: (string | number | null | undefined)[][]): string {
  const contenu = [entetes, ...lignes].map((l) => l.map(celluleCsv).join(";")).join("\r\n");
  return "﻿" + contenu;
}

export function reponseCsv(nomFichier: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
