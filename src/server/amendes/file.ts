// =====================================================================
//  File de lecture des PV importés, en tâche de fond dans le serveur du
//  CRM (aucun cron à installer). Démarrée par src/instrumentation.ts.
//  - toutes les 5 s (et aussitôt après un dépôt) : prend les PV « à lire »,
//    2 à la fois, et les fait lire par Claude ;
//  - un PV « réservé » depuis plus de 10 min (serveur redémarré pendant
//    la lecture) est repris ;
//  - au démarrage : calcule les raisons des PV « à valider » qui n'en ont
//    pas encore (PV saisis à la main avant le module).
// =====================================================================
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { cleApiConfiguree } from "./lecture";
import { evaluerAmende, traiterAmende } from "./traitement";

const CONCURRENCE = 2;
const INTERVALLE_MS = 5_000;

type Etat = { demarree: boolean; enCours: number; cycleEnCours: boolean; minuterie: ReturnType<typeof setInterval> | null };
const g = globalThis as unknown as { __vucaFileAmendes?: Etat };
const etat: Etat = (g.__vucaFileAmendes ??= { demarree: false, enCours: 0, cycleEnCours: false, minuterie: null });

/** Réserve le prochain PV « à lire » (sûr même si plusieurs cycles tournent). */
async function reserverSuivant(): Promise<string | null> {
  const lignes = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Amende" SET "ocrEnCoursLe" = now()
    WHERE id = (
      SELECT id FROM "Amende"
      WHERE statut = 'A_LIRE' AND ("ocrEnCoursLe" IS NULL OR "ocrEnCoursLe" < now() - interval '10 minutes')
      ORDER BY "creeLe", "fichierPage"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  return lignes[0]?.id ?? null;
}

async function cycle() {
  if (etat.cycleEnCours || !cleApiConfiguree()) return;
  etat.cycleEnCours = true;
  try {
    while (etat.enCours < CONCURRENCE) {
      const id = await reserverSuivant();
      if (!id) break;
      etat.enCours++;
      void traiterAmende(id)
        .catch((e) => console.error(`[amendes] lecture du PV ${id} : ${e instanceof Error ? e.message : e}`))
        .finally(() => {
          etat.enCours--;
          reveillerLectureAmendes();
        });
    }
  } catch (e) {
    console.error(`[amendes] file de lecture : ${e instanceof Error ? e.message : e}`);
  } finally {
    etat.cycleEnCours = false;
  }
}

/** À appeler après un dépôt : lance la lecture sans attendre le prochain passage. */
export function reveillerLectureAmendes() {
  setImmediate(() => void cycle());
}

/** Raisons des PV « à valider » qui n'en ont pas (anciens PV saisis à la main). */
async function rattraperAnciensPv() {
  const anciens = await db.amende.findMany({ where: { statut: "A_VALIDER", luLe: null, raisonsVerification: { equals: Prisma.DbNull } }, select: { id: true }, take: 500 });
  for (const a of anciens) await evaluerAmende(db, a.id).catch(() => undefined);
}

export function demarrerLectureAmendes() {
  if (etat.demarree) return;
  etat.demarree = true;
  etat.minuterie = setInterval(() => void cycle(), INTERVALLE_MS);
  etat.minuterie.unref?.();
  void rattraperAnciensPv().catch((e) => console.error(`[amendes] rattrapage : ${e instanceof Error ? e.message : e}`));
  reveillerLectureAmendes();
}
