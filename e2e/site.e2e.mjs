// Test de bout en bout du site public : accueil → liste → filtre → fiche → lien WhatsApp.
//
// À lancer contre un site EN LIGNE (pas en maintenance) avec au moins une annonce publiée :
//   npm run test:e2e:site
// Variables (toutes facultatives) :
//   E2E_SITE_URL   adresse du site            (défaut : http://vuca-auto.fr:3000)
//   E2E_RESOLVE    IP vers laquelle diriger le nom du site, pour tester en local (ex. 127.0.0.1)
//   E2E_WHATSAPP   numéro WhatsApp attendu, format international sans « + » (défaut : celui de la démo)
//   CHROMIUM_PATH  navigateur Chromium à utiliser (sinon : npx playwright-core install chromium)
import { chromium } from "playwright-core";

const SITE = (process.env.E2E_SITE_URL ?? "http://vuca-auto.fr:3000").replace(/\/$/, "");
const HOTE = new URL(SITE).hostname;
const NUMERO = process.env.E2E_WHATSAPP ?? "33639980000";
// Vrai agent utilisateur : « HeadlessChrome » est traité comme un robot par les compteurs.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let echecs = 0;
const ok = (condition, message) => {
  console.log(`${condition ? "✔" : "✘"} ${message}`);
  if (!condition) echecs++;
};
const normaliser = (s) => s.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const chiffres = (s) => s.replace(/\D/g, "");

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: process.env.E2E_RESOLVE ? [`--host-resolver-rules=MAP ${HOTE} ${process.env.E2E_RESOLVE}`] : [],
});

try {
  // ---------- Ordinateur
  const contexte = await navigateur.newContext({ userAgent: UA, locale: "fr-FR", viewport: { width: 1280, height: 900 } });
  const page = await contexte.newPage();

  // 1. Accueil
  const reponse = await page.goto(`${SITE}/`);
  const texteAccueil = normaliser(await page.locator("body").innerText());
  if (texteAccueil.toLowerCase().includes("arrive bientôt")) throw new Error("Le site est en maintenance : mettez-le en ligne (CRM → Site web → Général) avant le test.");
  ok(reponse?.status() === 200 && (await page.locator("h1").count()) === 1, "Accueil : page affichée avec un titre principal");

  // 2. Liste des voitures
  await page.getByRole("link", { name: "Voir les voitures" }).first().click();
  await page.waitForURL(`${SITE}/voitures`);
  await page.waitForLoadState("networkidle");
  const total = await page.locator(".s-carte").count();
  ok(total > 0, `Liste : ${total} voiture(s) affichée(s)`);

  // 3. Filtre par marque (première marque proposée)
  const marque = await page.locator("#marque option:not([value=''])").first().getAttribute("value");
  await page.selectOption("#marque", marque);
  await page.waitForURL(new RegExp(`marque=${encodeURIComponent(marque)}`));
  await page.waitForLoadState("networkidle");
  const titres = await page.locator(".s-carte h3").allInnerTexts();
  ok(titres.length > 0 && titres.every((t) => t.toLowerCase().startsWith(marque.toLowerCase())), `Filtre « ${marque} » : ${titres.length} voiture(s), toutes de cette marque`);
  ok(await page.getByRole("button", { name: `Retirer le filtre ${marque}` }).isVisible(), "Filtre : puce « Retirer le filtre » affichée");

  // 4. Fiche du premier résultat
  const carte = page.locator(".s-carte").first();
  const lienFiche = await carte.getAttribute("href");
  await carte.click();
  await page.waitForURL(`${SITE}${lienFiche}`);
  await page.waitForLoadState("networkidle");
  const h1 = normaliser(await page.locator("h1").innerText());
  ok(h1.toLowerCase().startsWith(marque.toLowerCase()), `Fiche : « ${h1} »`); // titres affichés en majuscules (CSS)
  const titreOnglet = normaliser(await page.title());
  ok(/ – .* km – .* \| /.test(titreOnglet), `Fiche : titre d'onglet « modèle année – km – prix | nom » (${titreOnglet})`);

  // 5. Lien WhatsApp : bon numéro, message pré-rempli avec le véhicule et son adresse
  const lienWa = await page.locator("aside").getByRole("link", { name: "Écrire sur WhatsApp" }).getAttribute("href");
  const message = normaliser(decodeURIComponent(lienWa?.split("?text=")[1] ?? ""));
  ok(lienWa?.startsWith(`https://wa.me/${NUMERO}?text=`), `WhatsApp : numéro ${NUMERO}`);
  ok(message.includes(marque) && message.includes(lienFiche), `WhatsApp : message pré-rempli (${message})`);
  const prix = normaliser(await page.locator("aside .s-etiquette-prix").first().innerText());
  if (/€/.test(prix)) ok(chiffres(message).includes(chiffres(prix)), `WhatsApp : le message cite le prix (${prix})`);

  // 6. Aucun cookie déposé par le site
  ok((await contexte.cookies()).length === 0, "Aucun cookie déposé");
  await contexte.close();

  // ---------- Téléphone : barre du bas de la fiche
  const mobile = await navigateur.newContext({ userAgent: UA, locale: "fr-FR", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pageMobile = await mobile.newPage();
  await pageMobile.goto(`${SITE}${lienFiche}`);
  const barre = pageMobile.locator("a[href^='https://wa.me/']:visible").last();
  const lienMobile = await barre.getAttribute("href");
  ok(lienMobile === lienWa, "Téléphone : la barre du bas ouvre le même message WhatsApp");
  const largeur = await pageMobile.evaluate(() => document.documentElement.scrollWidth);
  ok(largeur <= 390, `Téléphone : pas de défilement horizontal (${largeur} px)`);
  await mobile.close();
} catch (e) {
  echecs++;
  console.log(`✘ ${e instanceof Error ? e.message : e}`);
} finally {
  await navigateur.close();
}

console.log(echecs ? `\n${echecs} échec(s)` : "\nParcours du site : tout est vert.");
process.exit(echecs ? 1 : 0);
