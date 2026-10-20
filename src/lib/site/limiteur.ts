// =====================================================================
//  Limitation de débit des compteurs du site (en mémoire, rien n'est enregistré).
//   - débit : au plus N requêtes par minute et par visiteur (anti-robot) ;
//   - doublons : une même vue (même visiteur, même page) n'est comptée
//     qu'une fois par fenêtre (30 min), un même clic qu'une fois par 10 s.
//  Le « visiteur » est une empreinte de l'adresse IP, gardée quelques
//  minutes en mémoire puis oubliée (jamais écrite en base).
// =====================================================================

export type ReglesLimiteur = { requetesParMinute: number; fenetreDoublonMs: (type: string) => number; tailleMax: number };

export const REGLES_COMPTEURS: ReglesLimiteur = {
  requetesParMinute: 60,
  fenetreDoublonMs: (type) => (type.startsWith("VUE") ? 30 * 60_000 : 10_000),
  tailleMax: 20_000,
};

export type Decision = "compter" | "doublon" | "trop";

export class Limiteur {
  private debits = new Map<string, number[]>(); // visiteur → instants des dernières requêtes (1 min)
  private vus = new Map<string, number>(); // visiteur|type|clé → dernier comptage

  constructor(private regles: ReglesLimiteur = REGLES_COMPTEURS) {}

  decider(visiteur: string, type: string, cle: string, maintenant = Date.now()): Decision {
    this.nettoyerSiNecessaire(maintenant);
    const recents = (this.debits.get(visiteur) ?? []).filter((t) => maintenant - t < 60_000);
    recents.push(maintenant);
    this.debits.set(visiteur, recents);
    if (recents.length > this.regles.requetesParMinute) return "trop";

    const cleVue = `${visiteur}|${type}|${cle}`;
    const dernier = this.vus.get(cleVue);
    if (dernier !== undefined && maintenant - dernier < this.regles.fenetreDoublonMs(type)) return "doublon";
    this.vus.set(cleVue, maintenant);
    return "compter";
  }

  /** Oublie les entrées périmées (et tout, si la mémoire déborde malgré tout). */
  private nettoyerSiNecessaire(maintenant: number) {
    if (this.vus.size + this.debits.size < this.regles.tailleMax) return;
    for (const [k, t] of this.vus) if (maintenant - t >= this.regles.fenetreDoublonMs(k.split("|")[1] ?? "")) this.vus.delete(k);
    for (const [k, l] of this.debits) if (!l.some((t) => maintenant - t < 60_000)) this.debits.delete(k);
    if (this.vus.size + this.debits.size >= this.regles.tailleMax) {
      this.vus.clear();
      this.debits.clear();
    }
  }

  get taille() {
    return this.vus.size + this.debits.size;
  }
}

/** Navigateurs automatiques (moteurs de recherche, aperçus de liens, outils) : jamais comptés. */
const ROBOTS = /bot\b|bot\/|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|preview|lighthouse|headless|phantom|puppeteer|playwright|curl|wget|python|axios|node-fetch|go-http|java\//i;
export const estRobot = (agent: string | null | undefined) => !agent || ROBOTS.test(agent);
