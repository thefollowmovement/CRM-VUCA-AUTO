"use server";

import { revalidatePath } from "next/cache";
import { avecDroits, ErreurMetier, ROLES_ADMIN } from "@/lib/permissions";
import { analyserDemo, retirerDemo } from "@/server/demo";
import { revaliderSite } from "@/server/site/revalidation";

/** Retire les données de démonstration (ADMIN, confirmation « RETIRER » tapée à la main). */
export async function retirerDonneesDemo(confirmation: string) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    if (confirmation.trim().toUpperCase() !== "RETIRER") throw new ErreurMetier("Tapez RETIRER pour confirmer.");
    const plan = await analyserDemo();
    const rien = plan.vehicules.length + plan.clients.length + plan.investisseurs.length + plan.reglagesSite.length === 0;
    if (plan.retiree && rien) throw new ErreurMetier("La démonstration a déjà été retirée.");
    const r = await retirerDemo(u.id);
    revalidatePath("/", "layout");
    revaliderSite();
    return {
      ok: true,
      message: `Démonstration retirée : ${r.vehicules.length} véhicule(s), ${r.clients.length} client(s), ${r.investisseurs.length} investisseur(s).`,
    };
  });
}
