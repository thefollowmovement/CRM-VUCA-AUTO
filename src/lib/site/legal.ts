// Modèles de mentions légales et de politique de confidentialité, construits à partir
// des réglages du site. Ce sont des points de départ à relire (ce n'est pas un conseil juridique).
// Format : texte simple (gras **…** et listes « - »), comme les descriptions.

export const LONGUEUR_MAX_LEGAL = 20000;

export type EntreeLegal = {
  nomAffiche: string;
  formeJuridique: string | null;
  siret: string | null;
  adresseSiege: string | null;
  email: string | null;
  telephone: string | null;
  domaine: string | null;
  plausible: boolean;
  googleAnalytics: boolean;
};

const A_COMPLETER = (quoi: string) => `[à compléter : ${quoi}]`;

/** Champs manquants pour des mentions légales complètes. */
export function champsLegauxManquants(e: EntreeLegal): string[] {
  return [
    !e.formeJuridique && "forme juridique",
    !e.siret && "SIRET",
    !e.adresseSiege && "adresse du siège",
    !e.email && !e.telephone && "email ou téléphone",
  ].filter((x): x is string => !!x);
}

const siretLisible = (s: string) => s.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

export function modeleMentionsLegales(e: EntreeLegal): string {
  const site = e.domaine ?? "ce site";
  const contact = [e.email && `Email : ${e.email}`, e.telephone && `Téléphone : ${e.telephone}`].filter(Boolean) as string[];
  return [
    "**Éditeur du site**",
    `Le site ${site} est édité par ${e.nomAffiche}${e.formeJuridique ? `, ${e.formeJuridique}` : ""}.`,
    [
      `- Siège social : ${e.adresseSiege ?? A_COMPLETER("adresse du siège")}`,
      `- SIRET : ${e.siret ? siretLisible(e.siret) : A_COMPLETER("SIRET")}`,
      ...(contact.length ? contact.map((c) => `- ${c}`) : [`- Contact : ${A_COMPLETER("email ou téléphone")}`]),
    ].join("\n"),
    "**Directeur de la publication**",
    `Le représentant légal de ${e.nomAffiche}.`,
    "**Hébergement**",
    "Hostinger International Ltd, 61 Lordou Vironos Street, 6023 Larnaca, Chypre (www.hostinger.fr).",
    "**Annonces**",
    "Les annonces sont présentées de bonne foi, à titre informatif. Elles ne constituent pas une offre contractuelle : seuls le bon de commande et la facture remis lors de la vente font foi. Les photos sont celles des véhicules proposés. Prix indiqués en euros.",
    "**Propriété intellectuelle**",
    `Les textes, photos et logos de ce site appartiennent à ${e.nomAffiche}. Toute reproduction sans autorisation est interdite.`,
  ].join("\n\n");
}

export function modeleConfidentialite(e: EntreeLegal): string {
  const contact = e.email ?? e.telephone ?? A_COMPLETER("email de contact");
  const mesure = [
    "- Des compteurs anonymes : nombre de visites, de vues d'annonces et de clics « WhatsApp » ou « Appeler », par jour. Pour ne pas compter deux fois la même visite, une empreinte non réversible de votre adresse IP est gardée quelques minutes en mémoire, puis oubliée : elle n'est jamais enregistrée. Aucun cookie, aucun identifiant n'est conservé.",
    e.plausible && "- Plausible Analytics, un outil de mesure d'audience sans cookie et sans donnée personnelle.",
    e.googleAnalytics && "- Google Analytics, uniquement si vous l'acceptez dans le bandeau prévu à cet effet. Vous pouvez retirer votre accord à tout moment.",
  ].filter(Boolean) as string[];
  return [
    "**Responsable du traitement**",
    `${e.nomAffiche}${e.adresseSiege ? `, ${e.adresseSiege}` : ""}. Contact : ${contact}.`,
    "**Données collectées**",
    "Ce site ne contient aucun formulaire et ne demande aucune donnée personnelle. Lorsque vous nous contactez (WhatsApp, téléphone, email), nous utilisons vos coordonnées et vos messages uniquement pour vous répondre et, si vous achetez un véhicule, pour établir les documents de la vente.",
    "Les échanges sur WhatsApp sont également soumis aux conditions de WhatsApp (Meta).",
    "**Mesure d'audience**",
    mesure.join("\n"),
    "**Cookies**",
    e.googleAnalytics
      ? "Le site ne dépose aucun cookie, sauf ceux de Google Analytics si vous les acceptez."
      : "Le site ne dépose aucun cookie.",
    "**Durée de conservation**",
    "Les échanges avec les personnes qui ne deviennent pas clientes sont conservés au maximum 3 ans après le dernier contact. Les documents de vente sont conservés pendant la durée légale.",
    "**Vos droits**",
    `Vous pouvez demander l'accès, la rectification ou la suppression de vos données, ou vous opposer à leur utilisation, en écrivant à : ${contact}. Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).`,
  ].join("\n\n");
}
