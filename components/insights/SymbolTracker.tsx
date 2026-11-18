"use client";

/* eslint-disable @next/next/no-img-element -- local generated images served by our own route */
import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/client";
import type { InsightDream } from "./types";

export function SymbolTracker({ dreams }: { dreams: InsightDream[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const top = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dreams) for (const s of d.symbols) counts.set(s, (counts.get(s) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  }, [dreams]);
  const max = top[0]?.[1] ?? 1;

  return (
    <section className="glass p-6" aria-labelledby="symbols-title">
      <h2 id="symbols-title" className="font-display text-3xl">
        Recurring symbols
      </h2>
      {top.length === 0 ? (
        <p className="mt-4 text-ink-muted">Symbols will appear once a dream has been painted.</p>
      ) : (
        <ul className="mt-5 space-y-1">
          {top.map(([name, count]) => {
            const expanded = open === name;
            const matches = expanded ? dreams.filter((d) => d.symbols.includes(name)) : [];
            return (
              <li key={name}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : name)}
                  className="w-full rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-lavender/5"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-xl capitalize">{name}</span>
                    <span className="text-xs text-ink-muted">
                      in {count} of {dreams.length} dreams
                    </span>
                  </span>
                  <span aria-hidden className="mt-2 block h-1 rounded-full bg-line">
                    <span className="block h-full rounded-full bg-lavender/80" style={{ width: `${(count / max) * 100}%` }} />
                  </span>
                </button>
                {expanded && (
                  <ul className="mb-3 mt-2 grid gap-2 px-2 animate-fade-in">
                    {matches.map((d) => (
                      <li key={d.id}>
                        <Link href={`/dream/${d.id}`} className="flex min-h-14 items-center gap-3 rounded-xl p-1.5 hover:bg-lavender/5">
                          {d.imageUrl ? (
                            <img src={d.imageUrl} alt="" loading="lazy" className="h-11 w-11 rounded-lg object-cover" />
                          ) : (
                            <span className="h-11 w-11 rounded-lg bg-night-3" aria-hidden />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm">{d.title}</span>
                            <span suppressHydrationWarning className="block text-xs text-ink-faint">
                              {formatDate(d.createdAt, { dateStyle: "medium" })}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
