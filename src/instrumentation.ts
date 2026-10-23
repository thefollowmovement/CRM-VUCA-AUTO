// Exécuté une fois au démarrage du serveur Next.js : lance la file de lecture des PV importés.
// (Forme imposée par Next : l'import n'est compilé que pour l'environnement Node.js.)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { demarrerLectureAmendes } = await import("./server/amendes/file");
    demarrerLectureAmendes();
  }
}
