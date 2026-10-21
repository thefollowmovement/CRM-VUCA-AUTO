// Liste de contrôle « Avant la mise en ligne » (onglet Site web → Général).
import { db } from "@/lib/db";
import { REGLAGES_SITE_DEMO } from "@/lib/demo";
import { lireConfigDomaines } from "@/lib/domaines";
import { champsLegauxManquants } from "@/lib/site/legal";
import { STATUTS_PUBLIABLES } from "./annonces";
import { analyserDemo } from "@/server/demo";
import { lireReglagesSite } from "./reglages";

export type EtapeMiseEnLigne = { cle: string; libelle: string; detail: string; fait: boolean; lien: string; facultatif?: boolean };

export async function etapesMiseEnLigne(): Promise<{ enLigne: boolean; etapes: EtapeMiseEnLigne[] }> {
  const [r, demo] = await Promise.all([lireReglagesSite(), analyserDemo()]);
  const demoPresente = demo.vehicules.length + demo.clients.length + demo.investisseurs.length + demo.reglagesSite.length > 0;
  const annoncesReelles = await db.annonce.count({
    where: { publiee: true, vehicule: { statut: { in: [...STATUTS_PUBLIABLES] }, archiveLe: null }, vehiculeId: { notIn: demo.vehicules.map((v) => v.id) } },
  });
  const manquants = champsLegauxManquants({
    nomAffiche: r.nomAffiche,
    formeJuridique: r.formeJuridique,
    siret: r.siret,
    adresseSiege: r.adresseSiege,
    email: r.email,
    telephone: r.telephone,
    domaine: lireConfigDomaines(process.env).site,
    plausible: false,
    googleAnalytics: false,
  });
  const whatsappReel = !!r.whatsapp && r.whatsapp !== REGLAGES_SITE_DEMO.whatsapp;

  const etapes: EtapeMiseEnLigne[] = [
    {
      cle: "demo",
      libelle: "Retirer la démonstration",
      detail: demoPresente ? `${demo.vehicules.length} véhicule(s) d'exemple encore présents.` : "Aucune donnée d'exemple.",
      fait: !demoPresente,
      lien: "/reglages/demonstration",
    },
    {
      cle: "whatsapp",
      libelle: "Votre numéro WhatsApp",
      detail: whatsappReel ? `Les visiteurs vous écrivent au ${r.whatsapp}.` : "Sans numéro, les boutons WhatsApp n'apparaissent pas.",
      fait: whatsappReel,
      lien: "/site-web/contact",
    },
    {
      cle: "contact",
      libelle: "Coordonnées et horaires",
      detail: r.telephone || r.email ? "Téléphone ou email renseigné." : "Ajoutez au moins un téléphone ou un email.",
      fait: !!(r.telephone || r.email),
      lien: "/site-web/contact",
    },
    {
      cle: "legal",
      libelle: "Mentions légales",
      detail: r.mentionsLegales || manquants.length === 0 ? "Complètes." : `À compléter : ${manquants.join(", ")}.`,
      fait: !!r.mentionsLegales || manquants.length === 0,
      lien: "/site-web/legal",
    },
    {
      cle: "annonce",
      libelle: "Publier une première voiture",
      detail: annoncesReelles ? `${annoncesReelles} annonce(s) en ligne.` : "Depuis la fiche d'un véhicule « En vente », onglet Annonce.",
      fait: annoncesReelles > 0,
      lien: "/vehicules",
    },
    { cle: "logo", libelle: "Logo", detail: r.logoClairId ? "Logo ajouté." : "Facultatif : sans logo, le nom s'affiche en texte.", fait: !!r.logoClairId, lien: "/site-web", facultatif: true },
  ];
  return { enLigne: r.enLigne, etapes };
}
