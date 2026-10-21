// =====================================================================
//  Données de démonstration : comment les reconnaître à coup sûr.
//  Sert au retrait de la démo (Réglages → Démonstration) : on ne supprime
//  QUE ce qui correspond exactement aux fiches créées par prisma/seed.
//  Un test vérifie que ces listes suivent les données du seed.
// =====================================================================

/** Véhicules de démo : immatriculation → [marque, modèle] (les deux doivent correspondre). */
export const VEHICULES_DEMO: Record<string, [string, string]> = {
  "FG-208-PA": ["Peugeot", "208"],
  "GH-451-RC": ["Renault", "Clio V"],
  "FN-777-DS": ["Dacia", "Sandero"],
  "EZ-316-VW": ["Volkswagen", "Golf VII"],
  "GK-582-TY": ["Toyota", "Yaris"],
  "GB-303-TS": ["Tesla", "Model 3"],
  "GL-145-CP": ["Renault", "Captur"],
  "EV-930-PG": ["Peugeot", "3008"],
  "FA-118-BM": ["BMW", "Série 1"],
  "EM-283-CT": ["Citroën", "C3"],
  "DY-500-FT": ["Fiat", "500"],
  "GE-204-KN": ["Kia", "Niro"],
  // Démo du site (Phase S1)
  "FK-065-TW": ["Renault", "Twingo III"],
  "EX-122-CH": ["Toyota", "C-HR"],
  "FP-095-VW": ["Volkswagen", "Polo VI"],
  "FD-100-FF": ["Ford", "Fiesta"],
  "FS-130-PG": ["Peugeot", "2008"],
};

/** Investisseurs de démo : nom + email. */
export const INVESTISSEURS_DEMO_IDENTITES: { nom: string; email: string }[] = [
  { nom: "Karim Benali", email: "karim.benali@exemple.fr" },
  { nom: "Sophie Martin", email: "sophie.martin@exemple.fr" },
  { nom: "Thomas Lefèvre", email: "thomas.lefevre@exemple.fr" },
];

/** Clients de démo : nom + prénom + numéro de permis. */
export const CLIENTS_DEMO_IDENTITES: {
  nom: string;
  prenom: string;
  numeroPermis: string;
}[] = [
  { nom: "Moreau", prenom: "Lucas", numeroPermis: "120569300123" },
  { nom: "Haddad", prenom: "Inès", numeroPermis: "180769300456" },
  { nom: "Amrani", prenom: "Mehdi", numeroPermis: "250369300789" },
  { nom: "Robert", prenom: "Julie", numeroPermis: "010269300321" },
  { nom: "Garnier", prenom: "Thomas", numeroPermis: "950169300654" },
  { nom: "Petit", prenom: "Kevin", numeroPermis: "100869300999" },
];

/** Réglages du site posés par la démo : remis à zéro seulement s'ils n'ont pas été modifiés. */
export const REGLAGES_SITE_DEMO = {
  whatsapp: "+33639980000", // numéro réservé aux fictions (ARCEP)
  delaiReponse: "Réponse rapide en journée",
  moyensPaiement: ["Virement bancaire", "Chèque de banque"],
  /** Plages horaires de la démo, du lundi au dimanche. */
  plagesHoraires: ["9h – 12h, 14h – 19h", "9h – 12h, 14h – 19h", "9h – 12h, 14h – 19h", "9h – 12h, 14h – 19h", "9h – 12h, 14h – 19h", "10h – 17h", ""],
};

/** Repère (table Compteur) : la démo a été retirée, le seed ne la recharge plus jamais. */
export const REPERE_DEMO_RETIREE = "demo:retiree";

const egal = (a: string | null | undefined, b: string) => (a ?? "").trim().toLowerCase() === b.toLowerCase();

export function estVehiculeDemo(v: { immatriculation: string | null; marque: string; modele: string }): boolean {
  const attendu = v.immatriculation ? VEHICULES_DEMO[v.immatriculation] : undefined;
  return !!attendu && egal(v.marque, attendu[0]) && egal(v.modele, attendu[1]);
}

export function estInvestisseurDemo(p: { nom: string; email: string | null; type: string; estSysteme: boolean }): boolean {
  return p.type === "INVESTISSEUR" && !p.estSysteme && INVESTISSEURS_DEMO_IDENTITES.some((d) => egal(p.nom, d.nom) && egal(p.email, d.email));
}

export function estClientDemo(c: { nom: string; prenom: string | null; numeroPermis: string | null }): boolean {
  return CLIENTS_DEMO_IDENTITES.some((d) => egal(c.nom, d.nom) && egal(c.prenom, d.prenom) && egal(c.numeroPermis, d.numeroPermis));
}

/** Horaires identiques à ceux de la démo ? */
export function horairesDemo(horaires: unknown): boolean {
  if (!Array.isArray(horaires) || horaires.length !== 7) return false;
  return horaires.every((h, i) => {
    const plage = REGLAGES_SITE_DEMO.plagesHoraires[i]!;
    const x = h as { ouvert?: unknown; plages?: unknown };
    return x.ouvert === (plage !== "") && (x.plages ?? "") === plage;
  });
}

export function moyensPaiementDemo(moyens: unknown): boolean {
  return Array.isArray(moyens) && moyens.length === REGLAGES_SITE_DEMO.moyensPaiement.length && moyens.every((m, i) => m === REGLAGES_SITE_DEMO.moyensPaiement[i]);
}

/**
 * Valeur d'un compteur annuel après retrait : le plus grand numéro restant pour cette année
 * (« LOC-2026-0007 » → 7), 0 s'il n'en reste aucun. Le prochain numéro suit sans trou ni doublon.
 */
export function maxNumeroAnnuel(numeros: (string | null)[], annee: number): number {
  let max = 0;
  for (const n of numeros) {
    const m = n ? /-(\d{4})-(\d+)$/.exec(n) : null;
    if (m && Number(m[1]) === annee) max = Math.max(max, Number(m[2]));
  }
  return max;
}

/** Plus grand numéro de référence d'annonce restant (« VA-0012 » → 12). */
export function maxReferenceAnnonce(references: string[]): number {
  return references.reduce((max, r) => Math.max(max, Number(/(\d+)$/.exec(r)?.[1] ?? 0)), 0);
}
