// Lecture de la période et du partenaire depuis l'URL (dashboard, rapports).
import { bornesPeriode, PERIODES, type TypePeriode } from "@/lib/calculs/periode";
import { aujourdhuiISO } from "@/lib/format";

export function lirePeriode(sp: Record<string, string | string[] | undefined>) {
  const un = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const brut = un("periode");
  const periode: TypePeriode = (PERIODES as readonly string[]).includes(brut ?? "") ? (brut as TypePeriode) : "mois";
  const { du, au } = bornesPeriode(periode, aujourdhuiISO(), un("du"), un("au"));
  return { periode, du, au, partenaire: un("partenaire")?.slice(0, 40) };
}
