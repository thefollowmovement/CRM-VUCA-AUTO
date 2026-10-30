// Aperçu JPEG de la 1re page d'un PDF (miniature des avis scannés), via pdftoppm
// (paquet poppler-utils, installé par le script de mise à jour). Sans pdftoppm,
// renvoie null : l'écran propose alors d'ouvrir le PDF.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const executer = promisify(execFile);

/** `largeur` : largeur maximale de l'image en pixels. */
export async function apercuPdf(contenu: Buffer, largeur: number): Promise<Buffer | null> {
  const dossier = await mkdtemp(path.join(tmpdir(), "vuca-apercu-"));
  try {
    const entree = path.join(dossier, "page.pdf");
    await writeFile(entree, contenu);
    await executer("pdftoppm", ["-jpeg", "-jpegopt", "quality=85", "-f", "1", "-l", "1", "-scale-to", String(largeur), "-singlefile", entree, path.join(dossier, "apercu")], { timeout: 30_000 });
    return await readFile(path.join(dossier, "apercu.jpg"));
  } catch {
    return null;
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}
