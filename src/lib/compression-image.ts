// Compression des photos DANS LE NAVIGATEUR avant envoi (max 1600 px) :
// envoi beaucoup plus rapide depuis un téléphone sur le parking.
// Le serveur réoptimise de toute façon (et retire la position GPS).

export async function compresserImage(fichier: File, tailleMax = 1600, qualite = 0.82): Promise<File> {
  if (!fichier.type.startsWith("image/") || fichier.type === "image/gif") return fichier;
  try {
    const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    const echelle = Math.min(1, tailleMax / Math.max(image.width, image.height));
    const largeur = Math.round(image.width * echelle);
    const hauteur = Math.round(image.height * echelle);
    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fichier;
    ctx.drawImage(image, 0, 0, largeur, hauteur);
    image.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualite));
    if (!blob || blob.size >= fichier.size) return fichier; // déjà léger : on garde l'original
    return new File([blob], fichier.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Format non lisible par le navigateur (ex. HEIC sur certains appareils) : le serveur s'en charge.
    return fichier;
  }
}
