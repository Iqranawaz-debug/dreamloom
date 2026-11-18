"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MOODS } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";

type Props = { q: string; mood: string; symbol: string; symbols: string[] };

export function DiaryFilters({ q, mood, symbol, symbols }: Props) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(next: Partial<Pick<Props, "q" | "mood" | "symbol">>) {
    const values = { q: text, mood, symbol, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(values)) if (v.trim()) params.set(k, v.trim());
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/diary?${qs}` : "/diary", { scroll: false }));
  }

  const active = Boolean(q || mood || symbol);

  return (
    <form role="search" className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => e.preventDefault()} aria-busy={pending}>
      <div className="relative">
        <label htmlFor="diary-search" className="sr-only">
          Search your dreams
        </label>
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          id="diary-search"
          type="search"
          value={text}
          maxLength={200}
          placeholder="Search your dreams..."
          className="field pl-11"
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => go({ q: value }), 300);
          }}
        />
      </div>
      <div>
        <label htmlFor="diary-mood" className="sr-only">
          Filter by mood
        </label>
        <select id="diary-mood" className="field sm:w-40" value={mood} onChange={(e) => go({ mood: e.target.value })}>
          <option value="">All moods</option>
          {MOODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="diary-symbol" className="sr-only">
          Filter by symbol
        </label>
        <select id="diary-symbol" className="field sm:w-40" value={symbol} onChange={(e) => go({ symbol: e.target.value })}>
          <option value="">All symbols</option>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <button
          type="button"
          className="btn btn-ghost btn-sm justify-self-start sm:col-span-3"
          onClick={() => {
            setText("");
            go({ q: "", mood: "", symbol: "" });
          }}
        >
          <Icon name="close" className="h-4 w-4" /> Clear filters
        </button>
      )}
    </form>
  );
}
