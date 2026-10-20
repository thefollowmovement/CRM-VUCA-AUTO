"use client";

// Graphique « par jour » des statistiques du site (une seule série par graphique : jamais deux échelles).
// Couleurs : palette catégorielle validée du CRM (--serie-1…), fixe par mesure.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type PointGraphique = { jour: string; valeur: number };

const nombre = new Intl.NumberFormat("fr-FR");
const jourCourt = (iso: string) => {
  const [, m, j] = iso.split("-");
  return `${j}/${m}`;
};
const jourLong = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

export function GraphiqueJours({ points, libelle, couleur, unite }: { points: PointGraphique[]; libelle: string; couleur: string; unite: [string, string] }) {
  const max = Math.max(0, ...points.map((p) => p.valeur));
  return (
    <div className="flex flex-col gap-3">
      <div className="h-56 w-full" role="img" aria-label={`${libelle} par jour`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={points.length > 40 ? "12%" : "22%"}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="jour"
              tickFormatter={jourCourt}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              domain={[0, max === 0 ? 4 : "auto"]}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as PointGraphique | undefined) : undefined;
                if (!p) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-semibold first-letter:uppercase">{jourLong(p.jour)}</p>
                    <p className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-sm" style={{ background: couleur }} aria-hidden />
                      <span className="tabular-nums">
                        {nombre.format(p.valeur)} {p.valeur > 1 ? unite[1] : unite[0]}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="valeur" name={libelle} fill={couleur} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Les mêmes chiffres en tableau (lecteurs d'écran, impression) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Voir les chiffres par jour</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th className="px-3 py-1.5 font-medium">Jour</th>
                <th className="px-3 py-1.5 text-right font-medium">{libelle}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.jour} className="border-t">
                  <td className="px-3 py-1.5 first-letter:uppercase">{jourLong(p.jour)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{nombre.format(p.valeur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
