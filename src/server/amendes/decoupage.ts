// Découpage des fichiers déposés : un PDF de plusieurs pages devient un PDF par page
// (bibliothèque pdf-lib, en JavaScript : aucune dépendance système). Une image = une page.
import { PDFDocument } from "pdf-lib";

export type PageDeposee = { contenu: Buffer; typeMime: string; page: number; nbPages: number };

/** Nombre maximum de pages par fichier (au-delà : découper le scan en plusieurs fichiers). */
export const PAGES_MAX = 60;

export async function decouperPages(contenu: Buffer, typeMime: string): Promise<PageDeposee[]> {
  if (typeMime !== "application/pdf") return [{ contenu, typeMime, page: 1, nbPages: 1 }];
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(contenu, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new Error("PDF illisible ou protégé.");
  }
  const nbPages = source.getPageCount();
  if (nbPages === 0) throw new Error("Ce PDF ne contient aucune page.");
  if (nbPages > PAGES_MAX) throw new Error(`Ce PDF contient ${nbPages} pages : ${PAGES_MAX} au maximum par fichier.`);
  if (nbPages === 1) return [{ contenu, typeMime, page: 1, nbPages }];
  const pages: PageDeposee[] = [];
  for (let i = 0; i < nbPages; i++) {
    const unePage = await PDFDocument.create();
    const [copie] = await unePage.copyPages(source, [i]);
    unePage.addPage(copie!);
    pages.push({ contenu: Buffer.from(await unePage.save()), typeMime, page: i + 1, nbPages });
  }
  return pages;
}
