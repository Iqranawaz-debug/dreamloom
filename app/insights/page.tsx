import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getSetting, listDreams, setSetting } from "@/lib/db/queries";
import { writeReflection } from "@/lib/ai/text";
import { SymbolTracker } from "@/components/insights/SymbolTracker";
import { MoodChart } from "@/components/insights/MoodChart";
import { DreamMap } from "@/components/insights/DreamMap";
import type { InsightDream } from "@/components/insights/types";

export const metadata = { title: "Insights" };

/** Called after connection(), so this is per-request, not prerendered. */
const requestTime = () => Date.now();

async function Reflection() {
  await connection();
  const now = new Date();
  const key = `reflection:${now.getFullYear()}-${now.getMonth() + 1}`;
  const month = listDreams({ since: new Date(now.getFullYear(), now.getMonth(), 1) });
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(now);

  // Reuse the saved paragraph until a new dream arrives, so real AI isn't called on every visit.
  let text: string | null = null;
  try {
    const cached = JSON.parse(getSetting(key) ?? "null") as { count: number; text: string } | null;
    if (cached?.count === month.length) text = cached.text;
  } catch {}

  if (!text) {
    const symbolCounts = new Map<string, number>();
    const moodCounts = new Map<string, number>();
    for (const d of month) {
      for (const s of d.symbols) symbolCounts.set(s, (symbolCounts.get(s) ?? 0) + 1);
      if (d.mood) moodCounts.set(d.mood, (moodCounts.get(d.mood) ?? 0) + 1);
    }
    try {
      text = await writeReflection({
        monthLabel,
        dreamCount: month.length,
        topSymbols: [...symbolCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        moods: [...moodCounts].map(([mood, count]) => ({ mood, count })),
      });
      setSetting(key, JSON.stringify({ count: month.length, text }));
    } catch (e) {
      console.error("[insights] reflection failed:", e instanceof Error ? e.name : "unknown");
      return <p className="mt-4 leading-8 text-ink-muted">This month&apos;s reflection couldn&apos;t be written just now. It will try again on your next visit.</p>;
    }
  }
  return <p className="mt-4 font-display text-2xl leading-snug text-ink sm:text-3xl">{text}</p>;
}

async function InsightsContent() {
  await connection();
  const dreams: InsightDream[] = listDreams().map((d) => ({
    id: d.id,
    title: d.title ?? "Untitled dream",
    createdAt: new Date(d.createdAt).getTime(),
    mood: d.mood,
    imageUrl: d.imageUrl,
    symbols: d.symbols,
  }));

  if (dreams.length === 0)
    return (
      <div className="glass mx-auto mt-12 max-w-lg p-10 text-center">
        <p className="font-display text-3xl">Patterns gather slowly</p>
        <p className="mt-3 text-ink-muted">Once you&apos;ve recorded a few dreams, their symbols and moods will appear here.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Capture a dream
        </Link>
      </div>
    );

  return (
    <div className="mt-8 grid gap-6">
      <section className="glass p-6 sm:p-8" aria-labelledby="reflection-title">
        <h2 id="reflection-title" className="eyebrow">
          This month, gently
        </h2>
        <Suspense fallback={<div className="skeleton mt-4 h-24" role="status" aria-label="Writing this month's reflection" />}>
          <Reflection />
        </Suspense>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <SymbolTracker dreams={dreams} />
        <MoodChart dreams={dreams} now={requestTime()} />
      </div>
      <DreamMap dreams={dreams} />
    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="eyebrow">What keeps returning</p>
      <h1 className="font-display mt-2 text-5xl sm:text-6xl">Insights</h1>
      <Suspense fallback={<div className="skeleton mt-8 h-96" role="status" aria-label="Loading insights" />}>
        <InsightsContent />
      </Suspense>
    </div>
  );
}
