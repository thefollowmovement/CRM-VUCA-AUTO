// =====================================================================
//  Initialisation de la base.
//   npm run db:seed            → données de référence + compte admin
//   npm run db:seed -- --demo  → idem + données de démonstration
//  Sans danger si relancé : rien n'est créé en double.
// =====================================================================
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { genererMotDePasseTemporaire, hacherMotDePasse } from "../../src/lib/mot-de-passe";
import {
  CATEGORIES_DEPENSES,
  CONDITIONS_GENERALES_DEFAUT,
  ELEMENTS_CHECKLIST,
  MENTION_FACTURE_DEFAUT,
  OPTIONS_LOCATION,
} from "./donnees-base";
import { synchroniserEcheances } from "../../src/server/echeances";
import { chargerDemo } from "./demo";

const EMAIL_ADMIN = "admin@vucaauto.fr";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // 1. Réglages (ligne unique)
  await db.reglages.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      conditionsGenerales: CONDITIONS_GENERALES_DEFAUT,
      mentionFacture: MENTION_FACTURE_DEFAUT,
    },
  });

  // 2. Partenaire VUCA AUTO (société, non supprimable)
  const societe = await db.partenaire.findFirst({ where: { type: "SOCIETE" } });
  if (!societe) {
    await db.partenaire.create({
      data: { nom: "VUCA AUTO", type: "SOCIETE", estSysteme: true },
    });
  }

  // 3. Catégories de dépenses
  for (const [ordre, c] of CATEGORIES_DEPENSES.entries()) {
    await db.categorieDepense.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, ordre: (ordre + 1) * 10 },
    });
  }

  // 4. Options de location et check-list (seulement si vides)
  if ((await db.optionLocation.count()) === 0) {
    await db.optionLocation.createMany({
      data: OPTIONS_LOCATION.map((o, i) => ({ ...o, ordre: (i + 1) * 10 })),
    });
  }
  if ((await db.elementChecklist.count()) === 0) {
    await db.elementChecklist.createMany({
      data: ELEMENTS_CHECKLIST.map((e, i) => ({ ...e, ordre: (i + 1) * 10 })),
    });
  }

  // 5. Compte administrateur (mot de passe affiché UNE SEULE FOIS)
  let nouvelleInstallation = false;
  const admin = await db.utilisateur.findUnique({ where: { email: EMAIL_ADMIN } });
  if (!admin) {
    nouvelleInstallation = true;
    const motDePasse = genererMotDePasseTemporaire();
    await db.utilisateur.create({
      data: {
        nom: "Administrateur",
        email: EMAIL_ADMIN,
        motDePasseHash: await hacherMotDePasse(motDePasse),
        role: "ADMIN",
        doitChangerMotDePasse: true,
      },
    });
    const ligne = "=".repeat(60);
    console.log(`\n${ligne}`);
    console.log("  COMPTE ADMINISTRATEUR CRÉÉ — NOTEZ CE MOT DE PASSE");
    console.log(`  (il ne sera plus jamais affiché)`);
    console.log(`\n  Email        : ${EMAIL_ADMIN}`);
    console.log(`  Mot de passe : ${motDePasse}`);
    console.log(`\n  Vous devrez en choisir un nouveau à la première connexion.`);
    console.log(`${ligne}\n`);
  }

  // 6. Démo : demandée explicitement (--demo) ou activée par SEED_DEMO=true.
  //    Chaque bloc de démo n'est chargé qu'une seule fois (voir demo.ts).
  void nouvelleInstallation;
  if (process.argv.includes("--demo") || process.env.SEED_DEMO === "true") {
    const retiree = await db.compteur.findUnique({ where: { cle: "demo:retiree" } });
    await chargerDemo(db);
    console.log(retiree ? "Données de démonstration retirées : rien n'est rechargé." : "Données de démonstration à jour.");
  }

  // 7. Échéancier des locations créées avant la Phase 6 (une seule fois par contrat)
  const sansEcheancier = await db.contratLocation.findMany({ where: { echeances: { none: {} } }, select: { id: true, statut: true } });
  for (const c of sansEcheancier) {
    await db.$transaction(async (tx) => {
      await synchroniserEcheances(tx, c.id);
      if (c.statut === "ANNULEE") await tx.echeance.updateMany({ where: { contratId: c.id }, data: { statut: "ANNULEE" } });
    });
  }
  if (sansEcheancier.length) console.log(`Échéancier créé pour ${sansEcheancier.length} location(s).`);

  console.log("Base initialisée.");
}

main()
  .catch((erreur) => {
    console.error("Échec de l'initialisation :", erreur);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
