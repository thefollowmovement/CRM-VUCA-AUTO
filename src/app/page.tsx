import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/permissions";

export default async function Accueil() {
  const u = await utilisateurCourant();
  if (!u) redirect("/connexion");
  redirect(u.role === "INVESTISSEUR_LECTURE" ? "/portail" : "/dashboard");
}
