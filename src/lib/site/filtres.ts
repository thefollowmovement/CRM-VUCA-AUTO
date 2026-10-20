// Filtres et tri de la liste /voitures, conservés dans l'adresse (lien partageable) :
//   /voitures?marque=Peugeot&prix=15000&km=100000&annee=2019&carburant=Essence&boite=Automatique&tri=prix-asc

export const TRIS = ["recentes", "prix-asc", "prix-desc", "km"] as const;
export type Tri = (typeof TRIS)[number];
export const LIBELLES_TRI: Record<Tri, string> = { recentes: "Plus récentes", "prix-asc": "Prix croissant", "prix-desc": "Prix décroissant", km: "Kilométrage" };

export const PALIERS_PRIX = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000, 40000, 50000] as const; // euros
export const PALIERS_KM = [20000, 50000, 80000, 100000, 150000, 200000] as const;

export type Filtres = {
  marque: string | null;
  prixMax: number | null; // euros
  kmMax: number | null;
  anneeMin: number | null;
  carburant: string | null;
  boite: string | null;
  tri: Tri;
};
export const FILTRES_VIDES: Filtres = { marque: null, prixMax: null, kmMax: null, anneeMin: null, carburant: null, boite: null, tri: "recentes" };

/** Ce qu'il faut d'un véhicule pour le filtrer (VehiculePublic convient). */
export type VehiculeFiltrable = { marque: string; prixCentimes: number | null; kilometrage: number | null; annee: number | null; carburant: string | null; boite: string | null };

type Parametres = URLSearchParams | Record<string, string | string[] | undefined>;
const lire = (p: Parametres, cle: string): string | null => {
  const brut = p instanceof URLSearchParams ? p.get(cle) : p[cle];
  const v = (Array.isArray(brut) ? brut[0] : brut)?.trim();
  return v ? v.slice(0, 60) : null;
};
const entier = (v: string | null, min: number, max: number) => {
  if (!v || !/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
};

/** Lecture tolérante : une valeur invalide est simplement ignorée. */
export function lireFiltres(p: Parametres): Filtres {
  const tri = lire(p, "tri");
  return {
    marque: lire(p, "marque"),
    prixMax: entier(lire(p, "prix"), 1, 10_000_000),
    kmMax: entier(lire(p, "km"), 1, 10_000_000),
    anneeMin: entier(lire(p, "annee"), 1950, 2100),
    carburant: lire(p, "carburant"),
    boite: lire(p, "boite"),
    tri: (TRIS as readonly string[]).includes(tri ?? "") ? (tri as Tri) : "recentes",
  };
}

/** « ?marque=Peugeot&prix=15000 » (les valeurs par défaut ne sont pas écrites ; chaîne vide si aucun filtre). */
export function ecrireFiltres(f: Filtres): string {
  const p = new URLSearchParams();
  if (f.marque) p.set("marque", f.marque);
  if (f.prixMax) p.set("prix", String(f.prixMax));
  if (f.kmMax) p.set("km", String(f.kmMax));
  if (f.anneeMin) p.set("annee", String(f.anneeMin));
  if (f.carburant) p.set("carburant", f.carburant);
  if (f.boite) p.set("boite", f.boite);
  if (f.tri !== "recentes") p.set("tri", f.tri);
  const texte = p.toString();
  return texte ? `?${texte}` : "";
}

const egal = (a: string | null, b: string | null) => !!a && !!b && a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;
/** Valeurs absentes en fin de liste, quel que soit le sens du tri. */
const comparer = (a: number | null, b: number | null, sens: 1 | -1) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : (a - b) * sens);

/** Filtre puis trie (la liste d'entrée est supposée « plus récentes d'abord »). */
export function appliquerFiltres<T extends VehiculeFiltrable>(liste: T[], f: Filtres): T[] {
  const garde = liste.filter(
    (v) =>
      (!f.marque || egal(v.marque, f.marque)) &&
      (!f.prixMax || (v.prixCentimes !== null && v.prixCentimes <= f.prixMax * 100)) &&
      (!f.kmMax || (v.kilometrage !== null && v.kilometrage <= f.kmMax)) &&
      (!f.anneeMin || (v.annee !== null && v.annee >= f.anneeMin)) &&
      (!f.carburant || egal(v.carburant, f.carburant)) &&
      (!f.boite || egal(v.boite, f.boite)),
  );
  if (f.tri === "recentes") return garde;
  const triee = [...garde]; // tri stable : à égalité, l'ordre « plus récentes » est conservé
  if (f.tri === "prix-asc") triee.sort((a, b) => comparer(a.prixCentimes, b.prixCentimes, 1));
  if (f.tri === "prix-desc") triee.sort((a, b) => comparer(a.prixCentimes, b.prixCentimes, -1));
  if (f.tri === "km") triee.sort((a, b) => comparer(a.kilometrage, b.kilometrage, 1));
  return triee;
}

const unique = (l: (string | null)[]) => [...new Set(l.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "fr"));

/** Choix proposés dans les filtres, d'après les véhicules en ligne. */
export function optionsFiltres(liste: VehiculeFiltrable[]) {
  const annees = liste.map((v) => v.annee).filter((a): a is number => a !== null);
  const min = annees.length ? Math.min(...annees) : null;
  const max = annees.length ? Math.max(...annees) : null;
  return {
    marques: unique(liste.map((v) => v.marque)),
    carburants: unique(liste.map((v) => v.carburant)),
    boites: unique(liste.map((v) => v.boite)),
    prix: [...PALIERS_PRIX],
    km: [...PALIERS_KM],
    annees: min !== null && max !== null ? Array.from({ length: max - min + 1 }, (_, i) => max - i) : [],
  };
}

const nombre = new Intl.NumberFormat("fr-FR");

/** Étiquettes des filtres actifs (puces), avec la clé à retirer. */
export function etiquettesFiltres(f: Filtres): { cle: Exclude<keyof Filtres, "tri">; libelle: string }[] {
  const e: { cle: Exclude<keyof Filtres, "tri">; libelle: string }[] = [];
  if (f.marque) e.push({ cle: "marque", libelle: f.marque });
  if (f.prixMax) e.push({ cle: "prixMax", libelle: `Jusqu'à ${nombre.format(f.prixMax)} €` });
  if (f.kmMax) e.push({ cle: "kmMax", libelle: `Jusqu'à ${nombre.format(f.kmMax)} km` });
  if (f.anneeMin) e.push({ cle: "anneeMin", libelle: `Depuis ${f.anneeMin}` });
  if (f.carburant) e.push({ cle: "carburant", libelle: f.carburant });
  if (f.boite) e.push({ cle: "boite", libelle: f.boite });
  return e;
}

export const nombreFiltresActifs = (f: Filtres) => etiquettesFiltres(f).length;
