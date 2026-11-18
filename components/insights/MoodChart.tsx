"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MOODS } from "@/lib/constants";
import type { InsightDream } from "./types";

const DAY = 86_400_000;
const label = (t: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(t);

type Row = { start: number; label: string; total: number } & Record<string, number | string>;

/** Daily bars for 30 days, weekly bars for 90, always ending today. */
function buckets(dreams: InsightDream[], now: number, range: 30 | 90): Row[] {
  const size = range === 30 ? DAY : 7 * DAY;
  const count = Math.ceil((range * DAY) / size);
  const end = new Date(now).setHours(23, 59, 59, 999);
  const rows: Row[] = Array.from({ length: count }, (_, i) => {
    const start = end - (count - i) * size + 1;
    return { start, label: label(start), total: 0, ...Object.fromEntries(MOODS.map((m) => [m.id, 0])) } as Row;
  });
  for (const d of dreams) {
    const idx = Math.floor((d.createdAt - rows[0].start) / size);
    if (idx < 0 || idx >= count || !d.mood || !MOODS.some((m) => m.id === d.mood)) continue;
    rows[idx][d.mood] = (rows[idx][d.mood] as number) + 1;
    rows[idx].total += 1;
  }
  return rows;
}

function ChartTooltip({ active, payload, label: l }: { active?: boolean; payload?: { dataKey?: unknown; value?: unknown }[]; label?: unknown }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => Number(p.value) > 0);
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-line bg-night-3 px-3 py-2 text-xs shadow-[var(--shadow-md)]">
      <p className="mb-1 text-ink-muted">{String(l)}</p>
      {items.map((p) => {
        const m = MOODS.find((x) => x.id === p.dataKey);
        return (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink">
            <span className="mood-dot" style={{ background: m?.color }} aria-hidden />
            {m?.label}: {String(p.value)}
          </p>
        );
      })}
    </div>
  );
}

export function MoodChart({ dreams, now }: { dreams: InsightDream[]; now: number }) {
  const [range, setRange] = useState<30 | 90>(30);
  const rows = useMemo(() => buckets(dreams, now, range), [dreams, now, range]);
  const total = rows.reduce((n, r) => n + r.total, 0);

  return (
    <section className="glass p-6" aria-labelledby="mood-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mood-title" className="font-display text-3xl">
          Moods over time
        </h2>
        <div role="radiogroup" aria-label="Time range" className="flex gap-1">
          {([30, 90] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)} className="chip">
              {r} days
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-8 text-ink-muted">No moods were recorded in the last {range} days.</p>
      ) : (
        <>
          <div className="mt-6 h-64" role="img" aria-label={`Stacked bars of ${total} dream moods over the last ${range} days. A table follows.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="rgb(201 188 255 / 0.08)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: "#8f8bb3", fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} tick={{ fill: "#8f8bb3", fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(201 188 255 / 0.06)" }} />
                {MOODS.map((m) => (
                  <Bar key={m.id} dataKey={m.id} stackId="mood" fill={m.color} stroke="#14163a" strokeWidth={2} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Legend">
            {MOODS.map((m) => (
              <li key={m.id} className="flex items-center gap-1.5">
                <span className="mood-dot" style={{ background: m.color }} aria-hidden />
                {m.label}
              </li>
            ))}
          </ul>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-ink-muted hover:text-ink">View as table</summary>
            <div className="mt-3 max-h-56 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-ink-faint">
                  <tr>
                    <th scope="col" className="py-1 pr-3 font-normal">
                      {range === 30 ? "Day" : "Week of"}
                    </th>
                    {MOODS.map((m) => (
                      <th key={m.id} scope="col" className="py-1 pr-3 font-normal">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-ink-muted">
                  {rows
                    .filter((r) => r.total > 0)
                    .map((r) => (
                      <tr key={r.start} className="border-t border-line">
                        <th scope="row" className="py-1 pr-3 font-normal">
                          {r.label}
                        </th>
                        {MOODS.map((m) => (
                          <td key={m.id} className="py-1 pr-3 tabular-nums">
                            {r[m.id]}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
