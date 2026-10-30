"use client";

// Graphiques du dashboard et des rapports (Recharts). Montants en centimes.
// Palette catégorielle validée dans globals.css (--serie-1…6, --serie-autre).
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuros } from "@/lib/format";

const SERIES = [
  "var(--serie-1)",
  "var(--serie-2)",
  "var(--serie-3)",
  "var(--serie-4)",
  "var(--serie-5)",
  "var(--serie-6)",
];
const euros = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
  useGrouping: "always",
} as unknown as Intl.NumberFormatOptions);
const eurosCourt = (c: number) => `${euros.format(Math.round(c / 100))} €`;

function Pastille({ couleur }: { couleur: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-sm"
      style={{ background: couleur }}
      aria-hidden
    />
  );
}

export type PointMensuel = {
  cle: string;
  libelle: string;
  ventes: number;
  location: number;
};

/** Bénéfice mensuel sur 12 mois : ventes et location empilées (négatif sous l'axe). */
export function GraphiqueMensuel({ donnees }: { donnees: PointMensuel[] }) {
  const series = [
    { cle: "ventes", libelle: "Ventes", couleur: SERIES[0]! },
    { cle: "location", libelle: "Location", couleur: SERIES[1]! },
  ] as const;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.cle} className="flex items-center gap-1.5">
            <Pastille couleur={s.couleur} /> {s.libelle}
          </span>
        ))}
      </div>
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Bénéfice mensuel sur 12 mois, ventes et location"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={donnees}
            stackOffset="sign"
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
            barCategoryGap="25%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="libelle"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={84}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={eurosCourt}
            />
            <ReferenceLine
              y={0}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.5}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const p = active
                  ? (payload?.[0]?.payload as PointMensuel | undefined)
                  : undefined;
                if (!p) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-semibold">{p.libelle}</p>
                    {series.map((s) => (
                      <p key={s.cle} className="flex items-center gap-2">
                        <Pastille couleur={s.couleur} /> {s.libelle}{" "}
                        <span className="ml-auto pl-3 tabular-nums">
                          {formatEuros(p[s.cle])}
                        </span>
                      </p>
                    ))}
                    <p className="mt-1 flex border-t pt-1 font-semibold">
                      Bénéfice net{" "}
                      <span className="ml-auto pl-3 tabular-nums">
                        {formatEuros(p.ventes + p.location)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            {series.map((s) => (
              <Bar
                key={s.cle}
                dataKey={s.cle}
                name={s.libelle}
                stackId="a"
                fill={s.couleur}
                stroke="var(--card)"
                strokeWidth={1}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Anneau + légende chiffrée (la légende sert aussi de tableau). Au-delà de 5 parts : « Autres ». */
export function Anneau({
  donnees,
  libelleTotal,
}: {
  donnees: { libelle: string; montantCentimes: number }[];
  libelleTotal: string;
}) {
  const positives = donnees.filter((d) => d.montantCentimes > 0);
  const tete = positives.slice(0, 5);
  const reste = positives.slice(5).reduce((a, d) => a + d.montantCentimes, 0);
  const parts = [
    ...tete.map((d, i) => ({ ...d, couleur: SERIES[i]! })),
    ...(reste > 0
      ? [
          {
            libelle: "Autres",
            montantCentimes: reste,
            couleur: "var(--serie-autre)",
          },
        ]
      : []),
  ];
  const total = parts.reduce((a, d) => a + d.montantCentimes, 0);
  if (total === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Rien sur cette période.
      </p>
    );
  return (
    // Requête de conteneur : anneau à gauche seulement si la carte est assez large
    <div className="@container">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-4 @md:grid-cols-[10rem_minmax(0,1fr)]">
        <div
          className="relative mx-auto size-40"
          role="img"
          aria-label={libelleTotal}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={parts}
                dataKey="montantCentimes"
                nameKey="libelle"
                innerRadius="62%"
                outerRadius="100%"
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {parts.map((p) => (
                  <Cell key={p.libelle} fill={p.couleur} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const p = active
                    ? (payload?.[0]?.payload as
                        | (typeof parts)[number]
                        | undefined)
                    : undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="flex items-center gap-2 font-semibold">
                        <Pastille couleur={p.couleur} /> {p.libelle}
                      </p>
                      <p className="tabular-nums">
                        {formatEuros(p.montantCentimes)} ·{" "}
                        {Math.round((p.montantCentimes / total) * 100)} %
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground">Total</span>
            <span className="text-sm font-semibold tabular-nums">
              {eurosCourt(total)}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm">
          {parts.map((p) => (
            <li key={p.libelle} className="flex items-center gap-2">
              <Pastille couleur={p.couleur} />
              <span className="min-w-0 flex-1 truncate">{p.libelle}</span>
              <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                {Math.round((p.montantCentimes / total) * 100)} %
              </span>
              <span className="w-24 whitespace-nowrap text-right font-medium tabular-nums">
                {formatEuros(p.montantCentimes)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
